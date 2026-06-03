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

function titleWithSourceDate(title: string, sourceDate?: string | null) {
  if (!sourceDate || title.includes(sourceDate)) return title;
  return `${title} — ${sourceDate}`;
}

function ensureRenderedTitleDate(text: string, publication: HeraldPublicationMessageSource) {
  if (!publication.sourceDate) return text;

  const titlePrefix = "Архівний запис: ";
  const lines = text.split("\n");
  let changed = false;

  let updated = lines.map((line) => {
    if (publication.sourceType === "NEWS_MD_ARCHIVE" && line.startsWith(titlePrefix)) {
      const title = line.slice(titlePrefix.length);
      if (title.includes(publication.sourceDate!)) return line;
      changed = true;
      return `${titlePrefix}${titleWithSourceDate(title, publication.sourceDate)}`;
    }

    if (line === publication.title) {
      changed = true;
      return titleWithSourceDate(line, publication.sourceDate);
    }

    return line;
  });

  if (publication.sourceType === "NEWS_MD_ARCHIVE") {
    const legacyDateLine = `Дата запису: ${publication.sourceDate}`;
    const filtered = updated.filter((line) => line !== legacyDateLine);
    if (filtered.length !== updated.length) {
      changed = true;
      updated = filtered;
    }
  }

  return changed ? updated.join("\n") : text;
}

export function formatHeraldNewsMessage(entry: HeraldNewsEntry, options: { linkCommands?: boolean } = {}) {
  const body = entry.body || entry.raw.replace(/^##\s+.*(?:\n|$)/, "").trim();
  const source = { title: entry.title, sourceDate: entry.sourceDate, sourceType: "NEWS_MD", body };
  const plain = formatHeraldPublicationPlainMessage(source);
  return options.linkCommands === false ? plain : linkNewsPublicationMessage(plain, source);
}

export function formatHeraldPublicationPlainMessage(publication: HeraldPublicationMessageSource) {
  if (publication.renderedText) {
    return sanitizeHeraldChannelText(ensureRenderedTitleDate(publication.renderedText, publication));
  }

  if (publication.sourceType === "NEWS_MD_ARCHIVE") {
    return sanitizeHeraldChannelText([
      "📜 З архіву Канцелярії",
      "",
      `Архівний запис: ${titleWithSourceDate(publication.title, publication.sourceDate)}`,
      "",
      publication.body || "У цьому записі лишився тільки заголовок.",
    ].join("\n"));
  }

  return sanitizeHeraldChannelText([
    "📜 Канцелярія Межового Знаку",
    "",
    titleWithSourceDate(publication.title, publication.sourceDate),
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

function linkNewsPublicationMessage(text: string, publication: HeraldPublicationMessageSource) {
  const title = titleWithSourceDate(publication.title, publication.sourceDate);
  return text
    .split("\n")
    .map((line) => {
      if (line === title || line === publication.title) return `<b>${escapeHtml(line)}</b>`;
      return linkHeraldGameCommandMentions(line);
    })
    .join("\n");
}

export function formatHeraldPublicationMessage(publication: HeraldPublicationMessageSource) {
  if (publication.sourceType === "NEWS_MD_ARCHIVE") {
    return linkArchivePublicationMessage(formatHeraldPublicationPlainMessage(publication));
  }
  if (publication.sourceType === "NEWS_MD") {
    return linkNewsPublicationMessage(formatHeraldPublicationPlainMessage(publication), publication);
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
