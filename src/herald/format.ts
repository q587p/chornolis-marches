import type { HeraldNewsEntry } from "./newsMarkdown";
import { sanitizeHeraldChannelText } from "./safety";

export function formatHeraldNewsMessage(entry: HeraldNewsEntry) {
  const body = entry.body || entry.raw.replace(/^##\s+.*(?:\n|$)/, "").trim();
  return formatHeraldPublicationMessage({ title: entry.title, body });
}

export function formatHeraldPublicationMessage(publication: { title: string; body: string }) {
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
