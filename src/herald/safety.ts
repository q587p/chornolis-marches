const TELEGRAM_MESSAGE_LIMIT = 3900;
const TRUNCATED_SUFFIX = "\n\n[Запис скорочено для Telegram.]";
const REDACTED_SECRET = "[службову таємницю прибрано]";
const REDACTED_ID = "[службову позначку прибрано]";
const REDACTED_LOCATION = "[точне місце приховано]";

const SECRET_PATTERNS = [
  /\b\d{6,}:[A-Za-z0-9_-]{20,}\b/g,
  /\b(?:BOT_TOKEN|HERALD_BOT_TOKEN|DATABASE_URL|ADMIN_SET_SECRET|HERALD_ADMIN_IDS|ADMIN_TELEGRAM_IDS)\s*=\s*\S+/gi,
  /\b(?:postgres(?:ql)?|mysql|redis):\/\/[^\s/]+:[^\s@]+@[^\s]+/gi,
];

const TECHNICAL_ID_PATTERNS = [
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi,
  /\b(?:player|creature|location|event|publication|telegram|message|chat|source|admin|user)Id\s*[:=#]\s*[-\w]+/gi,
  /\b(?:player|creature|location|event|publication|telegram|message|chat|source|admin|user)_id\s*[:=#]\s*[-\w]+/gi,
  /\bid\s*[:=#]\s*\d{3,}\b/gi,
];

const LOCATION_PRECISION_PATTERNS = [
  /\b[xyz]\s*=\s*-?\d+\b/gi,
  /\b(?:x|y|z)\s*:\s*-?\d+\b/gi,
  /\(\s*-?\d+\s*,\s*-?\d+(?:\s*,\s*-?\d+)?\s*\)/g,
  /\b[a-z][a-z0-9]+(?:_[a-z0-9]+)*_\d{2,}_\d{2,}(?:_-?\d+)?\b/gi,
];

function redactSecrets(text: string) {
  return SECRET_PATTERNS.reduce((value, pattern) => value.replace(pattern, REDACTED_SECRET), text);
}

export function stripTechnicalIds(text: string) {
  return TECHNICAL_ID_PATTERNS.reduce((value, pattern) => value.replace(pattern, REDACTED_ID), text);
}

export function redactLocationPrecision(text: string) {
  return LOCATION_PRECISION_PATTERNS.reduce((value, pattern) => value.replace(pattern, REDACTED_LOCATION), text);
}

export function assertNoSecrets(text: string) {
  for (const pattern of SECRET_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(text)) {
      throw new Error("Herald text contains a secret-like value.");
    }
  }
}

export function truncateTelegramMessage(text: string, maxLength = TELEGRAM_MESSAGE_LIMIT) {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - TRUNCATED_SUFFIX.length)).trimEnd()}${TRUNCATED_SUFFIX}`;
}

export function sanitizeHeraldChannelText(text: string) {
  const redacted = redactLocationPrecision(stripTechnicalIds(redactSecrets(text)));
  assertNoSecrets(redacted);
  return truncateTelegramMessage(redacted);
}

export function parseTelegramChannelId(value: string) {
  const trimmed = value.trim();
  return /^-?\d+$/.test(trimmed) ? Number(trimmed) : trimmed;
}
