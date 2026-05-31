import type { HeraldNewsEntry } from "./newsMarkdown";
import { sanitizeHeraldChannelText } from "./safety";

export type HeraldPublicationMessageSource = {
  id?: number;
  title: string;
  body: string;
  sourceType?: string;
  renderedText?: string | null;
};

export function formatHeraldNewsMessage(entry: HeraldNewsEntry) {
  const body = entry.body || entry.raw.replace(/^##\s+.*(?:\n|$)/, "").trim();
  return formatHeraldPublicationMessage({ title: entry.title, body });
}

export function formatHeraldPublicationMessage(publication: HeraldPublicationMessageSource) {
  if (publication.renderedText) return sanitizeHeraldChannelText(publication.renderedText);

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

export function formatHeraldPublicationRepostMessage(publication: HeraldPublicationMessageSource) {
  const snapshot = formatHeraldPublicationMessage(publication);
  const idText = publication.id ? ` #${publication.id}` : "";
  return sanitizeHeraldChannelText([
    "📜 З архіву Канцелярії",
    "",
    `Повторна публікація з книги Канцелярії${idText}.`,
    "Telegram показує час нового повідомлення; первісну дату дивіться в самому записі, якщо вона там є.",
    "",
    snapshot,
  ].join("\n"));
}

export function formatHeraldNewsPreview(entry: HeraldNewsEntry) {
  return [
    "Попередній перегляд допису Канцелярії:",
    "",
    formatHeraldNewsMessage(entry),
  ].join("\n");
}
