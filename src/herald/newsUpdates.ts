import { escapeHtml } from "../utils/text";
import { archiveOrderedNewsEntries } from "./newsBackfill";
import type { HeraldNewsEntry, HeraldNewsEntriesReadResult } from "./newsMarkdown";
import { readAllNewsEntries } from "./newsMarkdown";
import { findExistingPublicationsByHashes } from "./publications";
import { truncateTelegramMessage } from "./safety";

const NEWS_UPDATE_NOTICE_LIMIT = 3400;
const DEFAULT_NEWS_UPDATE_ROW_LIMIT = 5;

export type HeraldNewsPublicationStatus = "missing" | "pending" | "canceled" | "published";

type ExistingHeraldNewsPublication = {
  id: number;
  contentHash: string | null;
  publishedAt: Date | null;
  visibility: string;
};

export type HeraldNewsUpdateRow = {
  index: number;
  entry: HeraldNewsEntry;
  publication?: ExistingHeraldNewsPublication;
  status: HeraldNewsPublicationStatus;
};

export type HeraldNewsUpdatePlan = {
  ok: true;
  rows: HeraldNewsUpdateRow[];
  actionableRows: HeraldNewsUpdateRow[];
  counts: Record<HeraldNewsPublicationStatus, number>;
  filePath?: string;
  parsedEntries?: number;
};

type HeraldNewsUpdatePlanReadResult = HeraldNewsUpdatePlan | Extract<HeraldNewsEntriesReadResult, { ok: false }>;

function publicationStatus(publication: ExistingHeraldNewsPublication | undefined): HeraldNewsPublicationStatus {
  if (!publication) return "missing";
  if (publication.publishedAt) return "published";
  if (publication.visibility !== "PUBLIC") return "canceled";
  return "pending";
}

function statusLabel(status: HeraldNewsPublicationStatus) {
  if (status === "published") return "опубліковано";
  if (status === "pending") return "у черзі";
  if (status === "canceled") return "скасовано";
  return "ще не внесено";
}

function entryPreviewLines(entry: HeraldNewsEntry, maxLines = 3) {
  return entry.body
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, maxLines);
}

function truncatePreviewLine(line: string, maxLength = 180) {
  if (line.length <= maxLength) return line;
  return `${line.slice(0, maxLength - 1).trimEnd()}…`;
}

export function buildHeraldNewsUpdateRows(
  entries: readonly HeraldNewsEntry[],
  publications: readonly ExistingHeraldNewsPublication[],
) {
  const ordered = archiveOrderedNewsEntries(entries);
  const publicationByHash = new Map(publications.flatMap((publication) => (
    publication.contentHash ? [[publication.contentHash, publication] as const] : []
  )));

  const rows = ordered.map((entry, index) => {
    const publication = publicationByHash.get(entry.contentHash);
    const status = publicationStatus(publication);
    return {
      index: index + 1,
      entry,
      publication,
      status,
    };
  });

  const counts = rows.reduce((acc, row) => {
    acc[row.status] += 1;
    return acc;
  }, { missing: 0, pending: 0, canceled: 0, published: 0 } as Record<HeraldNewsPublicationStatus, number>);

  return {
    rows,
    actionableRows: rows.filter((row) => row.status === "missing" || row.status === "canceled"),
    counts,
  };
}

export async function readHeraldNewsUpdatePlan(): Promise<HeraldNewsUpdatePlanReadResult> {
  const read = await readAllNewsEntries();
  if (!read.ok) return read;

  const publications = await findExistingPublicationsByHashes(read.entries.map((entry) => entry.contentHash));
  const plan = buildHeraldNewsUpdateRows(read.entries, publications);

  return {
    ok: true,
    ...plan,
    filePath: read.filePath,
    parsedEntries: read.parsedEntries,
  };
}

export function formatHeraldNewsUpdatesNotice(
  plan: Pick<HeraldNewsUpdatePlan, "rows" | "actionableRows" | "counts" | "parsedEntries">,
  rowLimit = DEFAULT_NEWS_UPDATE_ROW_LIMIT,
) {
  if (!plan.rows.length) {
    return "Канцелярія перечитала news.md, але не знайшла жодного запису.";
  }

  const visibleRows = plan.actionableRows.slice(0, Math.max(1, rowLimit));

  if (!plan.actionableRows.length) {
    return [
      "Канцелярія перечитала news.md.",
      "",
      "Нових записів без черги чи публікації не видно.",
      `Усього записів: ${plan.rows.length}. Опубліковано: ${plan.counts.published}. У черзі: ${plan.counts.pending}. Скасовано: ${plan.counts.canceled}.`,
    ].join("\n");
  }

  const lines = [
    "Канцелярія перечитала news.md і знайшла записи, які ще не мають активної публікації.",
    "",
    `Потребують уваги: ${plan.actionableRows.length}. У черзі: ${plan.counts.pending}. Опубліковано: ${plan.counts.published}.`,
    "",
  ];

  for (const row of visibleRows) {
    lines.push(`${row.index}. <b>${escapeHtml(row.entry.title)}</b>`);
    lines.push(`Стан: ${statusLabel(row.status)}.`);

    const preview = entryPreviewLines(row.entry);
    if (preview.length) {
      lines.push("Прев'ю:");
      for (const previewLine of preview) {
        lines.push(`- ${escapeHtml(truncatePreviewLine(previewLine))}`);
      }
    }

    lines.push(`Переглянути: /news_archive_preview ${row.index}`);
    lines.push(`Опублікувати: /news_archive_post ${row.index}`);
    lines.push("");
  }

  const hiddenCount = plan.actionableRows.length - visibleRows.length;
  if (hiddenCount > 0) {
    lines.push(`...і ще ${hiddenCount} записів. Повний список: /news_archive_list`);
    lines.push("");
  }

  lines.push("Це тільки перевірка. Автоматична публікація від цього не запускається.");
  return truncateTelegramMessage(lines.join("\n"), NEWS_UPDATE_NOTICE_LIMIT);
}
