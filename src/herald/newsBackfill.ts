import fs from "fs/promises";
import path from "path";
import type { HeraldNewsEntry } from "./newsMarkdown";
import { parseNewsEntries } from "./newsMarkdown";
import { findExistingPublicationsByHashes, queueHeraldPublication } from "./publications";

const DEFAULT_BACKFILL_INTERVAL_MS = 30 * 60 * 1000;
const MIN_BACKFILL_INTERVAL_MS = 60 * 1000;
const MAX_BACKFILL_INTERVAL_MS = 24 * 60 * 60 * 1000;
const NEWS_ARCHIVE_SOURCE_TYPE = "NEWS_MD_ARCHIVE";

function clampInterval(value: number) {
  if (!Number.isFinite(value)) return DEFAULT_BACKFILL_INTERVAL_MS;
  return Math.max(MIN_BACKFILL_INTERVAL_MS, Math.min(MAX_BACKFILL_INTERVAL_MS, Math.floor(value)));
}

export function parseBackfillIntervalMs(input: string | undefined) {
  const raw = input?.trim().toLowerCase();
  if (!raw) return DEFAULT_BACKFILL_INTERVAL_MS;

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
  return [...entries].reverse();
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
    const publication = await queueHeraldPublication({
      sourceType: NEWS_ARCHIVE_SOURCE_TYPE,
      sourceId: entry.title,
      title: entry.title,
      body: formatArchiveBody(entry),
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
