export function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function stripUnsafeText(text: string) {
  return text.replace(/[\u0000-\u001f\u007f]/g, "").trim();
}
