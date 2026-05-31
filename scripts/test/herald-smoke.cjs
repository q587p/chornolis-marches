const assert = require("node:assert/strict");

require("ts-node/register");

const { parseHeraldAdminIds, isHeraldAdminId } = require("../../src/herald/admin");
const { formatHeraldPublicationMessage } = require("../../src/herald/format");
const {
  heraldGatheringLine,
  heraldPracticePhrase,
  heraldTrailPhrase,
} = require("../../src/herald/infoThresholds");
const { parseLatestNewsEntry } = require("../../src/herald/newsMarkdown");
const {
  assertNoSecrets,
  parseTelegramChannelId,
  redactLocationPrecision,
  sanitizeHeraldChannelText,
  stripTechnicalIds,
  truncateTelegramMessage,
} = require("../../src/herald/safety");

const markdown = [
  "# Новини",
  "",
  "## 12026-06-01 — Свіжий запис",
  "",
  "Канцелярія занотувала тиху зміну.",
  "",
  "## 12026-05-31 — Старий запис",
  "",
  "Цей запис уже нижче в книзі.",
].join("\n");

const latest = parseLatestNewsEntry(markdown);
assert.ok(latest);
assert.equal(latest.title, "12026-06-01 — Свіжий запис");
assert.match(latest.body, /тиху зміну/);
assert.doesNotMatch(latest.body, /Старий запис/);
assert.match(latest.contentHash, /^[a-f0-9]{64}$/);
assert.equal(parseLatestNewsEntry(markdown).contentHash, latest.contentHash);
assert.notEqual(parseLatestNewsEntry(markdown.replace("тиху зміну", "іншу зміну")).contentHash, latest.contentHash);
assert.equal(parseLatestNewsEntry("# Тільки заголовок\n\nБез release entry."), null);

const admins = parseHeraldAdminIds([" 123 ", "", "456"]);
assert.equal(admins.size, 2);
assert.equal(isHeraldAdminId(123, admins), true);
assert.equal(isHeraldAdminId("456", admins), true);
assert.equal(isHeraldAdminId(789, admins), false);
assert.equal(isHeraldAdminId(undefined, admins), false);

assert.equal(parseTelegramChannelId("-1001234567890"), -1001234567890);
assert.equal(parseTelegramChannelId(" @mezhovyi_znak "), "@mezhovyi_znak");

assert.throws(
  () => assertNoSecrets("HERALD_BOT_TOKEN=123456:abcdefghijklmnopqrstuvwxyz"),
  /secret-like value/,
);
assert.doesNotThrow(() => assertNoSecrets("Канцелярія на місці."));

assert.equal(
  stripTechnicalIds("playerId:12345 і id=98765 лишилися в чернетці"),
  "[службову позначку прибрано] і [службову позначку прибрано] лишилися в чернетці",
);
assert.equal(
  redactLocationPrecision("forest_07_00 на x=7, y=0"),
  "[точне місце приховано] на [точне місце приховано], [точне місце приховано]",
);

const sanitized = sanitizeHeraldChannelText(
  "HERALD_BOT_TOKEN=123456:abcdefghijklmnopqrstuvwxyz playerId=42 forest_07_00",
);
assert.doesNotMatch(sanitized, /123456:abcdefghijklmnopqrstuvwxyz/);
assert.doesNotMatch(sanitized, /playerId=42/);
assert.doesNotMatch(sanitized, /forest_07_00/);

const longMessage = truncateTelegramMessage("а".repeat(4000), 120);
assert.ok(longMessage.length <= 120);
assert.match(longMessage, /Запис скорочено для Telegram/);

const formatted = formatHeraldPublicationMessage({
  title: "Тестовий запис id=123456",
  body: "Точне місце: border_12_09. Токен: 123456:abcdefghijklmnopqrstuvwxyz",
});
assert.doesNotMatch(formatted, /123456:abcdefghijklmnopqrstuvwxyz/);
assert.doesNotMatch(formatted, /border_12_09/);
assert.match(formatted, /Канцелярія Межового Знаку/);

assert.equal(heraldTrailPhrase(0), "Канцелярія ще майже не має записів про ці кроки.");
assert.equal(heraldTrailPhrase(3), "сліди трапляються зрідка");
assert.equal(heraldTrailPhrase(42), "ліс уже пам’ятає ці кроки");
assert.match(heraldTrailPhrase(120), /польових нотатках/);

assert.equal(heraldGatheringLine(0, 0), "Збір: Канцелярія ще майже не має записів.");
assert.match(heraldGatheringLine(6, 0), /кошик/);
assert.match(heraldGatheringLine(20, 12), /трави, ягоди й гриби/);
assert.match(heraldGatheringLine(80, 70), /польові нотатки/);

assert.match(heraldPracticePhrase(0, "Полювання"), /майже порожньо/);
assert.match(heraldPracticePhrase(5, "Полювання"), /зрідка/);
assert.match(heraldPracticePhrase(20, "Полювання"), /певних рухів/);
assert.match(heraldPracticePhrase(40, "Полювання"), /польових нотатках/);

console.log("herald smoke tests passed");
