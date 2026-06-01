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
  | { ok: true; entry: HeraldNewsEntry }
  | { ok: false; error: string };

function contentHash(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function extractNewsSourceMetadata(title: string) {
  const sourceDate = title.match(/\b\d{4,5}-\d{2}-\d{2}\b/u)?.[0];
  const sourceVersion = title.match(/\b\d+\.\d+\.\d+\b/u)?.[0];
  return { sourceDate, sourceVersion };
}

export function parseLatestNewsEntry(markdown: string): HeraldNewsEntry | null {
  return parseNewsEntries(markdown)[0] ?? null;
}

export function parseNewsEntries(markdown: string): HeraldNewsEntry[] {
  return markdown
    .split(/\n(?=##\s+)/)
    .map((section) => section.trim())
    .filter((section) => section.startsWith("## "))
    .map((section, sourceIndex) => {
      const [heading = "", ...bodyLines] = section.split("\n");
      const title = heading.replace(/^##\s+/, "").trim() || "Новини Порубіжжя";
      const body = bodyLines.join("\n").trim();
      const metadata = extractNewsSourceMetadata(title);

      return {
        title,
        body,
        raw: section,
        sourceIndex,
        contentHash: contentHash(section),
        ...metadata,
      };
    });
}

export async function readLatestNewsEntry(filePath = path.join(process.cwd(), "news.md")): Promise<HeraldNewsReadResult> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const entry = parseLatestNewsEntry(raw);
    if (!entry) return { ok: false, error: "Канцелярія не знайшла жодного запису в news.md." };
    return { ok: true, entry };
  } catch {
    return { ok: false, error: "Канцелярія не змогла прочитати news.md." };
  }
}
