import { createHash } from "crypto";
import fs from "fs/promises";
import path from "path";

export type HeraldNewsEntry = {
  title: string;
  body: string;
  raw: string;
  sourceIndex: number;
  contentHash: string;
  sourceDate?: string;
  sourceVersion?: string;
};

export type HeraldNewsReadResult =
  | { ok: true; entry: HeraldNewsEntry; filePath: string; exists: true; parsedEntries: number }
  | { ok: false; error: string; filePath: string; exists: boolean; parsedEntries?: number; cause?: unknown };

export type HeraldNewsEntriesReadResult =
  | { ok: true; entries: HeraldNewsEntry[]; filePath: string; exists: true; parsedEntries: number }
  | { ok: false; error: string; filePath: string; exists: boolean; parsedEntries?: number; cause?: unknown };

export type HeraldNewsFileReadResult =
  | { ok: true; raw: string; filePath: string; exists: true }
  | { ok: false; error: string; filePath: string; exists: boolean; cause?: unknown };

function contentHash(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function resolveHeraldNewsPath(filePath = path.join(process.cwd(), "news.md")) {
  return path.resolve(filePath);
}

async function fileExists(filePath: string) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export function heraldNewsErrorLogDetails(error: unknown) {
  if (error instanceof Error) {
    return { message: error.message, stack: error.stack };
  }
  return { message: String(error) };
}

export function extractNewsSourceMetadata(title: string) {
  const sourceDate = title.match(/\b\d{4,5}-\d{2}-\d{2}\b/u)?.[0];
  const sourceVersion = title.match(/\b\d+\.\d+\.(?:\d+|x)\b/iu)?.[0];
  return { sourceDate, sourceVersion };
}

export function extractChangelogVersionDates(markdown: string) {
  const versionDates = new Map<string, string>();
  for (const match of markdown.matchAll(/^##\s+(\d+\.\d+\.(?:\d+|x))\b[^\n]*\b(\d{4,5}-\d{2}-\d{2})\b/gimu)) {
    versionDates.set(match[1], match[2]);
  }
  return versionDates;
}

export function applyNewsSourceDateFallbacks(entries: readonly HeraldNewsEntry[], versionDates: ReadonlyMap<string, string>) {
  return entries.map((entry) => {
    if (entry.sourceDate || !entry.sourceVersion) return entry;
    const sourceDate = versionDates.get(entry.sourceVersion);
    return sourceDate ? { ...entry, sourceDate } : entry;
  });
}

export function parseLatestNewsEntry(markdown: string): HeraldNewsEntry | null {
  return parseNewsEntries(markdown)[0] ?? null;
}

export function parseNewsEntries(markdown: string): HeraldNewsEntry[] {
  const sections = markdown
    .split(/\n(?=##\s+)/)
    .map((section) => section.trim())
    .filter((section) => section.startsWith("## "));

  const entries: HeraldNewsEntry[] = [];
  for (const [sourceIndex, section] of sections.entries()) {
    try {
      const [heading = "", ...bodyLines] = section.split("\n");
      const title = heading.replace(/^##\s+/, "").trim() || "Новини Порубіжжя";
      const body = bodyLines.join("\n").trim();
      const metadata = extractNewsSourceMetadata(title);

      entries.push({
        title,
        body,
        raw: section,
        sourceIndex,
        contentHash: contentHash(section),
        ...metadata,
      });
    } catch (error) {
      console.warn("Herald news parser skipped malformed news.md entry:", {
        sourceIndex,
        error: heraldNewsErrorLogDetails(error),
      });
    }
  }

  return entries;
}

export async function readNewsMarkdownFile(filePath?: string): Promise<HeraldNewsFileReadResult> {
  const resolvedPath = resolveHeraldNewsPath(filePath);
  const exists = await fileExists(resolvedPath);

  try {
    const raw = await fs.readFile(resolvedPath, "utf8");
    return { ok: true, raw, filePath: resolvedPath, exists: true };
  } catch (error) {
    return {
      ok: false,
      error: exists
        ? "Канцелярія знайшла news.md, але не змогла його прочитати."
        : "Канцелярія не змогла прочитати news.md.",
      filePath: resolvedPath,
      exists,
      cause: error,
    };
  }
}

export async function readAllNewsEntries(filePath?: string): Promise<HeraldNewsEntriesReadResult> {
  const file = await readNewsMarkdownFile(filePath);
  if (!file.ok) return file;

  try {
    let entries = parseNewsEntries(file.raw);
    try {
      const changelog = await fs.readFile(path.join(path.dirname(file.filePath), "CHANGELOG.md"), "utf8");
      entries = applyNewsSourceDateFallbacks(entries, extractChangelogVersionDates(changelog));
    } catch {
      // news.md is the canonical source; CHANGELOG.md only fills older missing dates when available.
    }
    return {
      ok: true,
      entries,
      filePath: file.filePath,
      exists: true,
      parsedEntries: entries.length,
    };
  } catch (error) {
    return {
      ok: false,
      error: "Канцелярія знайшла news.md, але спіткнулася на розборі архіву. Подробиці записано в logs.",
      filePath: file.filePath,
      exists: true,
      parsedEntries: 0,
      cause: error,
    };
  }
}

export async function readLatestNewsEntry(filePath = path.join(process.cwd(), "news.md")): Promise<HeraldNewsReadResult> {
  const read = await readAllNewsEntries(filePath);
  if (!read.ok) return read;

  const entry = read.entries[0] ?? null;
  if (!entry) {
    return {
      ok: false,
      error: "Канцелярія не знайшла жодного запису в news.md.",
      filePath: read.filePath,
      exists: true,
      parsedEntries: 0,
    };
  }

  return {
    ok: true,
    entry,
    filePath: read.filePath,
    exists: true,
    parsedEntries: read.parsedEntries,
  };
}
