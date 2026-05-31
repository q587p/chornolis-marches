import type { HeraldNewsEntry } from "./newsMarkdown";

const TELEGRAM_MESSAGE_LIMIT = 3900;

function truncateForTelegram(text: string, maxLength = TELEGRAM_MESSAGE_LIMIT) {
  if (text.length <= maxLength) return text;
  const suffix = "\n\n[Запис скорочено для Telegram.]";
  return `${text.slice(0, Math.max(0, maxLength - suffix.length)).trimEnd()}${suffix}`;
}

export function formatHeraldNewsMessage(entry: HeraldNewsEntry) {
  const body = entry.body || entry.raw.replace(/^##\s+.*(?:\n|$)/, "").trim();
  return formatHeraldPublicationMessage({ title: entry.title, body });
}

export function formatHeraldPublicationMessage(publication: { title: string; body: string }) {
  return truncateForTelegram([
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
