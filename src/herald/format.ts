import type { HeraldNewsEntry } from "./newsMarkdown";
import { sanitizeHeraldChannelText } from "./safety";

export function formatHeraldNewsMessage(entry: HeraldNewsEntry) {
  const body = entry.body || entry.raw.replace(/^##\s+.*(?:\n|$)/, "").trim();
  return formatHeraldPublicationMessage({ title: entry.title, body });
}

export function formatHeraldPublicationMessage(publication: { title: string; body: string; sourceType?: string }) {
  if (publication.sourceType === "NEWS_MD_ARCHIVE") {
    return sanitizeHeraldChannelText([
      "📜 З архіву Канцелярії",
      "",
      `Архівний запис: ${publication.title}`,
      "",
      publication.body || "У цьому записі лишився тільки заголовок.",
    ].join("\n"));
  }

  return sanitizeHeraldChannelText([
    "📜 Канцелярія Межового Знаку",
    "",
    publication.title,
    "",
    publication.body || "Запис поки порожній.",
  ].join("\n"));
}

export function formatHeraldNewsPreview(entry: HeraldNewsEntry) {
  return [
    "Попередній перегляд допису Канцелярії:",
    "",
    formatHeraldNewsMessage(entry),
  ].join("\n");
}
