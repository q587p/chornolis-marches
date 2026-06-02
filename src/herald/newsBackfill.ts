import fs from "fs/promises";
import path from "path";
import { config } from "../config";
import type { HeraldNewsEntry } from "./newsMarkdown";
import { parseNewsEntries } from "./newsMarkdown";
import { formatHeraldPublicationPlainMessage } from "./format";
import {
  countArchivePublications,
  findExistingPublicationsByHashes,
  listPendingArchivePublications,
  queueHeraldPublication,
  reschedulePendingArchivePublications,
} from "./publications";

export const NEWS_ARCHIVE_SOURCE_TYPE = "NEWS_MD_ARCHIVE";
export const DEFAULT_BACKFILL_INTERVAL_MS = 13 * 60 * 1000;
const MIN_BACKFILL_INTERVAL_MS = 60 * 1000;
const MAX_BACKFILL_INTERVAL_MS = 24 * 60 * 60 * 1000;

function clampInterval(value: number) {
  if (!Number.isFinite(value)) return DEFAULT_BACKFILL_INTERVAL_MS;
  return Math.max(MIN_BACKFILL_INTERVAL_MS, Math.min(MAX_BACKFILL_INTERVAL_MS, Math.floor(value)));
}

export function parseBackfillIntervalMs(
  input: string | undefined,
  defaultIntervalMs = config.heraldArchiveIntervalMs ?? DEFAULT_BACKFILL_INTERVAL_MS,
) {
  const raw = input?.trim().toLowerCase();
  if (!raw) return defaultIntervalMs;

  const match = raw.match(/^(\d+)\s*(m|min|хв|h|hr|год|s|sec|с)?$/u);
  if (!match) return null;

  const amount = Number(match[1]);
  const unit = match[2] ?? "m";
  const multiplier =
    unit === "h" || unit === "hr" || unit === "год"
      ? 60 * 60 * 1000
      : unit === "s" || unit === "sec" || unit === "с"
        ? 1000
        : 60 * 1000;

  return clampInterval(amount * multiplier);
}

export function formatBackfillInterval(ms: number) {
  const minutes = Math.round(ms / 60_000);
  if (minutes >= 60 && minutes % 60 === 0) return `${minutes / 60} год`;
  return `${minutes} хв`;
}

export function chronologicalNewsEntries(entries: readonly HeraldNewsEntry[]) {
  return archiveOrderedNewsEntries(entries);
}

function semanticVersionParts(value?: string) {
  if (!value) return null;
  const parts = value.split(".").map((part) => {
    if (part.toLowerCase() === "x") return -1;
    return Number(part);
  });
  if (parts.length < 2 || parts.some((part) => !Number.isInteger(part) || part < -1)) return null;
  return parts;
}

function compareSemanticVersions(left?: string, right?: string) {
  const leftParts = semanticVersionParts(left);
  const rightParts = semanticVersionParts(right);
  if (!leftParts || !rightParts) return null;

  const length = Math.max(leftParts.length, rightParts.length);
  for (let index = 0; index < length; index += 1) {
    const diff = (leftParts[index] ?? 0) - (rightParts[index] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

export function archiveOrderedNewsEntries(entries: readonly HeraldNewsEntry[]) {
  return [...entries].sort((left, right) => {
    if (left.sourceDate && right.sourceDate && left.sourceDate !== right.sourceDate) {
      return left.sourceDate.localeCompare(right.sourceDate);
    }

    const versionCompare = compareSemanticVersions(left.sourceVersion, right.sourceVersion);
    if (versionCompare !== null && versionCompare !== 0) return versionCompare;

    return left.sourceIndex - right.sourceIndex;
  });
}

export function formatArchiveBody(entry: HeraldNewsEntry) {
  return entry.body || "У цьому записі лишився тільки заголовок.";
}

export async function readAllNewsEntries(filePath = path.join(process.cwd(), "news.md")) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return { ok: true as const, entries: parseNewsEntries(raw) };
  } catch {
    return { ok: false as const, error: "Канцелярія не змогла прочитати news.md." };
  }
}

async function newsBackfillPlan(entries: readonly HeraldNewsEntry[]) {
  const chronological = chronologicalNewsEntries(entries);
  const existing = await findExistingPublicationsByHashes(chronological.map((entry) => entry.contentHash));
  const existingByHash = new Map(existing.flatMap((publication) => (
    publication.contentHash ? [[publication.contentHash, publication] as const] : []
  )));

  const missing = chronological.filter((entry) => !existingByHash.has(entry.contentHash));
  const queued = existing.filter((publication) => !publication.publishedAt && publication.visibility === "PUBLIC").length;
  const published = existing.filter((publication) => Boolean(publication.publishedAt)).length;
  const skipped = chronological.length - missing.length;

  return { chronological, existing, missing, queued, published, skipped };
}

export async function previewNewsBackfill(entries: readonly HeraldNewsEntry[]) {
  const plan = await newsBackfillPlan(entries);
  return {
    total: plan.chronological.length,
    missing: plan.missing,
    queued: plan.queued,
    published: plan.published,
    skipped: plan.skipped,
  };
}

export async function queueNewsBackfill(entries: readonly HeraldNewsEntry[], intervalMs: number, now = new Date()) {
  const plan = await newsBackfillPlan(entries);
  const queued = [];

  for (const [index, entry] of plan.missing.entries()) {
    const availableAt = new Date(now.getTime() + index * intervalMs);
    const archiveOrder = plan.chronological.findIndex((ordered) => ordered.contentHash === entry.contentHash);
    const publication = await queueHeraldPublication({
      sourceType: NEWS_ARCHIVE_SOURCE_TYPE,
      sourceId: entry.title,
      sourceDate: entry.sourceDate,
      sourceVersion: entry.sourceVersion,
      title: entry.title,
      body: formatArchiveBody(entry),
      renderedText: formatHeraldPublicationPlainMessage({
        sourceType: NEWS_ARCHIVE_SOURCE_TYPE,
        title: entry.title,
        body: formatArchiveBody(entry),
      }),
      archiveOrder,
      availableAt,
      contentHash: entry.contentHash,
    });
    queued.push(publication);
  }

  return {
    total: plan.chronological.length,
    queued,
    skipped: plan.skipped,
    intervalMs,
  };
}

export async function rescheduleNewsBackfillPending(entries: readonly HeraldNewsEntry[], intervalMs: number, now = new Date()) {
  const ordered = chronologicalNewsEntries(entries);
  const orderByHash = new Map(ordered.map((entry, index) => [entry.contentHash, index] as const));
  const existing = await findExistingPublicationsByHashes(ordered.map((entry) => entry.contentHash));
  const pendingArchive = existing
    .filter((publication) => publication.sourceType === NEWS_ARCHIVE_SOURCE_TYPE && !publication.publishedAt && publication.visibility === "PUBLIC")
    .sort((left, right) => {
      const leftOrder = left.contentHash ? orderByHash.get(left.contentHash) : undefined;
      const rightOrder = right.contentHash ? orderByHash.get(right.contentHash) : undefined;
      return (leftOrder ?? Number.MAX_SAFE_INTEGER) - (rightOrder ?? Number.MAX_SAFE_INTEGER) || left.id - right.id;
    });

  for (const [index, publication] of pendingArchive.entries()) {
    await queueHeraldPublication({
      sourceType: NEWS_ARCHIVE_SOURCE_TYPE,
      sourceId: publication.sourceId ?? publication.title,
      sourceDate: publication.sourceDate ?? undefined,
      sourceVersion: publication.sourceVersion ?? undefined,
      title: publication.title,
      body: publication.body,
      renderedText: publication.renderedText ?? undefined,
      archiveOrder: publication.contentHash ? orderByHash.get(publication.contentHash) : undefined,
      availableAt: new Date(now.getTime() + index * intervalMs),
      contentHash: publication.contentHash ?? undefined,
    });
  }

  await reschedulePendingArchivePublications(intervalMs, now, NEWS_ARCHIVE_SOURCE_TYPE);
  const pending = await listPendingArchivePublications(NEWS_ARCHIVE_SOURCE_TYPE);

  return {
    count: pending.length,
    intervalMs,
    nextAvailableAt: pending[0]?.availableAt ?? null,
    nextTitle: pending[0]?.title ?? null,
  };
}

export async function newsBackfillStatus() {
  const [counts, pending] = await Promise.all([
    countArchivePublications(NEWS_ARCHIVE_SOURCE_TYPE),
    listPendingArchivePublications(NEWS_ARCHIVE_SOURCE_TYPE),
  ]);
  return {
    pending: counts.pending,
    published: counts.published,
    next: pending[0] ?? null,
    intervalMs: config.heraldArchiveIntervalMs,
    rebalanceOverdue: config.heraldRebalanceOverduePublications,
  };
}
