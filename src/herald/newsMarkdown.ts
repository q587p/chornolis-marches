import { createHash } from "crypto";
import fs from "fs/promises";
import path from "path";

export type HeraldNewsEntry = {
  title: string;
  body: string;
  raw: string;
  contentHash: string;
};

export type HeraldNewsReadResult =
  | { ok: true; entry: HeraldNewsEntry }
  | { ok: false; error: string };

function contentHash(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function parseLatestNewsEntry(markdown: string): HeraldNewsEntry | null {
  const latest = markdown
    .split(/\n(?=##\s+)/)
    .map((section) => section.trim())
    .find((section) => section.startsWith("## "));

  if (!latest) return null;

  const [heading = "", ...bodyLines] = latest.split("\n");
  const title = heading.replace(/^##\s+/, "").trim() || "Новини Порубіжжя";
  const body = bodyLines.join("\n").trim();

  return {
    title,
    body,
    raw: latest,
    contentHash: contentHash(latest),
  };
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
