import type { HeraldNewsEntry } from "./newsMarkdown";
import { linkHeraldGameCommandMentions } from "./gameLinks";
import { sanitizeHeraldChannelText } from "./safety";
import { escapeHtml } from "../utils/text";

export type HeraldPublicationMessageSource = {
  id?: number;
  title: string;
  body: string;
  sourceType?: string;
  sourceDate?: string | null;
  sourceVersion?: string | null;
  renderedText?: string | null;
};

export function formatHeraldNewsMessage(entry: HeraldNewsEntry, options: { linkCommands?: boolean } = {}) {
  const body = entry.body || entry.raw.replace(/^##\s+.*(?:\n|$)/, "").trim();
  const plain = formatHeraldPublicationPlainMessage({ title: entry.title, body });
  return options.linkCommands === false ? plain : linkHeraldGameCommandMentions(plain);
}

export function formatHeraldPublicationPlainMessage(publication: HeraldPublicationMessageSource) {
  if (publication.renderedText) return sanitizeHeraldChannelText(publication.renderedText);

  if (publication.sourceType === "NEWS_MD_ARCHIVE") {
    const metadata = publication.sourceDate ? [`Дата запису: ${publication.sourceDate}`] : [];
    return sanitizeHeraldChannelText([
      "📜 З архіву Канцелярії",
      "",
      `Архівний запис: ${publication.title}`,
      ...metadata,
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

function linkArchivePublicationMessage(text: string) {
  const titlePrefix = "Архівний запис: ";
  return text
    .split("\n")
    .map((line) => {
      if (!line.startsWith(titlePrefix)) return linkHeraldGameCommandMentions(line);
      return `${escapeHtml(titlePrefix)}<b>${escapeHtml(line.slice(titlePrefix.length))}</b>`;
    })
    .join("\n");
}

export function formatHeraldPublicationMessage(publication: HeraldPublicationMessageSource) {
  if (publication.sourceType === "NEWS_MD_ARCHIVE") {
    return linkArchivePublicationMessage(formatHeraldPublicationPlainMessage(publication));
  }
  return linkHeraldGameCommandMentions(formatHeraldPublicationPlainMessage(publication));
}

export function formatHeraldPublicationRepostMessage(publication: HeraldPublicationMessageSource) {
  const snapshot = formatHeraldPublicationMessage(publication);
  const idText = publication.id ? ` #${publication.id}` : "";
  const originalDateText = publication.sourceDate
    ? `Первісна дата запису: ${publication.sourceDate}.`
    : "Первісну дату не знайдено в збереженому записі.";
  return sanitizeHeraldChannelText([
    "📜 З архіву Канцелярії",
    "",
    `Повторна публікація з книги Канцелярії${idText}.`,
    originalDateText,
    "Telegram показує час нового повідомлення; старий час публікації не відновлювався.",
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
