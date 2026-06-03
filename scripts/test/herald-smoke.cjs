const assert = require("node:assert/strict");
const path = require("node:path");

require("ts-node/register");

const { parseHeraldAdminIds, isHeraldAdminId } = require("../../src/herald/admin");
const { formatHeraldPublicationMessage, formatHeraldPublicationRepostMessage } = require("../../src/herald/format");
const { linkHeraldGameCommandMentions } = require("../../src/herald/gameLinks");
const { formatWorldDigestDateLine } = require("../../src/herald/digest");
const { formatHeraldCommandList, formatHeraldWhoami } = require("../../src/herald/help");
const { renderHeraldAnonymousInfoTarget, renderHeraldPublicInfoMissing, renderHeraldPublicPlayerInfo } = require("../../src/herald/info");
const { resolveHeraldInfoTargetUser } = require("../../src/herald/infoCommands");
const {
  heraldGatheringLine,
  heraldPracticePhrase,
  heraldTrailPhrase,
} = require("../../src/herald/infoThresholds");
const {
  archiveOrderedNewsEntries,
  chronologicalNewsEntries,
  DEFAULT_BACKFILL_INTERVAL_MS,
  formatArchiveBody,
  formatBackfillInterval,
  parseBackfillIntervalMs,
} = require("../../src/herald/newsBackfill");
const { formatArchiveList, splitArchiveListMessage } = require("../../src/herald/newsArchiveCommands");
const {
  extractNewsSourceMetadata,
  parseLatestNewsEntry,
  parseNewsEntries,
  readAllNewsEntries,
  readLatestNewsEntry,
  resolveHeraldNewsPath,
} = require("../../src/herald/newsMarkdown");
const { HERALD_NEWS_SOURCE_TYPES } = require("../../src/herald/publications");
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
assert.equal(latest.sourceDate, "12026-06-01");
assert.equal(parseLatestNewsEntry(markdown).contentHash, latest.contentHash);
assert.notEqual(parseLatestNewsEntry(markdown.replace("тиху зміну", "іншу зміну")).contentHash, latest.contentHash);
assert.equal(parseLatestNewsEntry("# Тільки заголовок\n\nБез release entry."), null);
assert.deepEqual(extractNewsSourceMetadata("0.14.7 — Канцелярія має місце"), {
  sourceDate: undefined,
  sourceVersion: "0.14.7",
});
assert.deepEqual(extractNewsSourceMetadata("0.0.x — Ранній прототип"), {
  sourceDate: undefined,
  sourceVersion: "0.0.x",
});

const entries = parseNewsEntries(markdown);
assert.equal(entries.length, 2);
assert.equal(entries[0].title, "12026-06-01 — Свіжий запис");
assert.equal(entries[1].title, "12026-05-31 — Старий запис");
assert.deepEqual(chronologicalNewsEntries(entries).map((entry) => entry.title), [
  "12026-05-31 — Старий запис",
  "12026-06-01 — Свіжий запис",
]);
const versionMarkdown = [
  "## 0.4.0",
  "zero",
  "## 0.4.2",
  "two",
  "## 0.4.3",
  "three",
  "## 0.4.1",
  "one",
  "## 0.4.10",
  "ten",
].join("\n\n");
assert.deepEqual(archiveOrderedNewsEntries(parseNewsEntries(versionMarkdown)).map((entry) => entry.sourceVersion), [
  "0.4.0",
  "0.4.1",
  "0.4.2",
  "0.4.3",
  "0.4.10",
]);
const earlyPrototypeMarkdown = [
  "## 0.1.0 — Перший бот Порубіжжя — 12026-05-04",
  "first bot",
  "## 0.0.x — Ранній прототип",
  "early prototype",
].join("\n\n");
assert.deepEqual(archiveOrderedNewsEntries(parseNewsEntries(earlyPrototypeMarkdown)).map((entry) => entry.sourceVersion), [
  "0.0.x",
  "0.1.0",
]);
const sourceOrderMarkdown = [
  "## Без дати",
  "first",
  "## Ще без дати",
  "second",
].join("\n\n");
assert.deepEqual(archiveOrderedNewsEntries(parseNewsEntries(sourceOrderMarkdown)).map((entry) => entry.title), [
  "Без дати",
  "Ще без дати",
]);
assert.equal(parseBackfillIntervalMs(undefined, DEFAULT_BACKFILL_INTERVAL_MS), 13 * 60 * 1000);
assert.equal(parseBackfillIntervalMs("13m"), 13 * 60 * 1000);
assert.equal(parseBackfillIntervalMs("30m"), 30 * 60 * 1000);
assert.equal(parseBackfillIntervalMs("2h"), 2 * 60 * 60 * 1000);
assert.equal(parseBackfillIntervalMs("bad interval"), null);
assert.equal(formatBackfillInterval(13 * 60 * 1000), "13 хв");
assert.equal(formatBackfillInterval(2 * 60 * 60 * 1000), "2 год");
assert.match(formatArchiveBody(entries[1]), /Цей запис уже нижче/);

const archiveList = formatArchiveList({
  ok: true,
  rows: [{
    index: 1,
    entry: { title: "0.1.0 <raw>", contentHash: "hash" },
    publication: undefined,
    status: "missing",
  }],
  counts: { missing: 1, pending: 0, canceled: 0, published: 0 },
  pendingTotal: 0,
});
assert.match(archiveList, /0\.1\.0 &lt;raw&gt;/);
assert.doesNotMatch(archiveList, /<raw>|<index>/);
assert.match(archiveList, /\/news_archive_preview \[/);
assert.match(archiveList, /\/news_archive_post \[/);
assert.match(archiveList, /\/news_archive_force_post \[/);
assert.ok(splitArchiveListMessage(["header", ...Array.from({ length: 80 }, (_, index) => `${index + 1}. ${"entry ".repeat(20)}`)].join("\n"), 600).length > 1);

const admins = parseHeraldAdminIds([" 123 ", "", "456"]);
assert.equal(admins.size, 2);
assert.equal(isHeraldAdminId(123, admins), true);
assert.equal(isHeraldAdminId("456", admins), true);
assert.equal(isHeraldAdminId(789, admins), false);
assert.equal(isHeraldAdminId(undefined, admins), false);

assert.deepEqual(HERALD_NEWS_SOURCE_TYPES, ["NEWS_MD", "NEWS_MD_ARCHIVE"]);
const heraldAdminCommands = formatHeraldCommandList(true);
assert.match(heraldAdminCommands, /\/pause_publications/);
assert.match(heraldAdminCommands, /\/resume_publications/);
assert.match(heraldAdminCommands, /\/cancel_pending_publications/);
assert.match(heraldAdminCommands, /\/backfill_news_cancel/);
assert.match(heraldAdminCommands, /\/news_archive_list/);
assert.match(heraldAdminCommands, /\/news_archive_preview/);
assert.match(heraldAdminCommands, /\/news_archive_post/);
assert.match(heraldAdminCommands, /\/news_archive_force_post/);
assert.match(heraldAdminCommands, /\/news_archive_reload/);
assert.doesNotMatch(formatHeraldCommandList(false), /\/pause_publications/);
assert.doesNotMatch(formatHeraldCommandList(false), /\/news_archive_post/);
assert.doesNotMatch(formatHeraldCommandList(false), /\/news_archive_force_post/);

const whoami = formatHeraldWhoami({
  telegramUserId: 123456789,
  username: "q587p",
  chatId: -1001234567890,
  chatType: "supergroup",
  threadId: 42,
});
assert.match(whoami, /Канцелярія впізнала вашу печатку\./);
assert.match(whoami, /Telegram user ID: 123456789/);
assert.match(whoami, /Username: @q587p/);
assert.match(whoami, /Chat ID: -1001234567890/);
assert.match(whoami, /Chat type: supergroup/);
assert.match(whoami, /Thread ID: 42/);
assert.doesNotMatch(whoami, /HERALD_BOT_TOKEN|DATABASE_URL|ADMIN_SET_SECRET/);

const privateWhoami = formatHeraldWhoami({
  telegramUserId: 12,
  chatId: 12,
  chatType: "private",
});
assert.match(privateWhoami, /Username: немає/);
assert.doesNotMatch(privateWhoami, /Thread ID:/);

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

const linkedCommands = linkHeraldGameCommandMentions("`/start` `/news` /auto `/rest` /sleep `/track` /time /calendar /weather /inventory /gather_honey /gather_beeswax /cleanupCreatures /unknown", "Chornolis_bot");
assert.match(linkedCommands, /<a href="https:\/\/t\.me\/Chornolis_bot\?start=cmd_start">\/start<\/a>/);
assert.match(linkedCommands, /<a href="https:\/\/t\.me\/Chornolis_bot\?start=cmd_news">\/news<\/a>/);
assert.match(linkedCommands, /<a href="https:\/\/t\.me\/Chornolis_bot\?start=cmd_auto">\/auto<\/a>/);
assert.match(linkedCommands, /<a href="https:\/\/t\.me\/Chornolis_bot\?start=cmd_rest">\/rest<\/a>/);
assert.match(linkedCommands, /<a href="https:\/\/t\.me\/Chornolis_bot\?start=cmd_sleep">\/sleep<\/a>/);
assert.match(linkedCommands, /<a href="https:\/\/t\.me\/Chornolis_bot\?start=cmd_track">\/track<\/a>/);
assert.match(linkedCommands, /<a href="https:\/\/t\.me\/Chornolis_bot\?start=cmd_time">\/time<\/a>/);
assert.match(linkedCommands, /<a href="https:\/\/t\.me\/Chornolis_bot\?start=cmd_calendar">\/calendar<\/a>/);
assert.match(linkedCommands, /<a href="https:\/\/t\.me\/Chornolis_bot\?start=cmd_weather">\/weather<\/a>/);
assert.match(linkedCommands, /<a href="https:\/\/t\.me\/Chornolis_bot\?start=cmd_inventory">\/inventory<\/a>/);
assert.match(linkedCommands, /<a href="https:\/\/t\.me\/Chornolis_bot\?start=cmd_gather_honey">\/gather_honey<\/a>/);
assert.match(linkedCommands, /<a href="https:\/\/t\.me\/Chornolis_bot\?start=cmd_gather_beeswax">\/gather_beeswax<\/a>/);
assert.match(linkedCommands, /\/cleanupCreatures/);
assert.match(linkedCommands, /\/unknown/);
assert.doesNotMatch(linkHeraldGameCommandMentions("/cleanupCreatures", "Chornolis_bot"), /href=/);
assert.doesNotMatch(linkHeraldGameCommandMentions("/unknown", "Chornolis_bot"), /href=/);

const archiveFormatted = formatHeraldPublicationMessage({
  sourceType: "NEWS_MD_ARCHIVE",
  title: entries[1].title,
  sourceDate: entries[1].sourceDate,
  body: formatArchiveBody(entries[1]),
});
assert.match(archiveFormatted, /📜 З архіву Канцелярії/);
assert.match(archiveFormatted, /Архівний запис: <b>12026-05-31/);
assert.match(archiveFormatted, /Дата запису: 12026-05-31/);
assert.match(archiveFormatted, /Цей запис уже нижче/);
assert.doesNotMatch(archiveFormatted, /📜 Канцелярія Межового Знаку/);

const archiveFormattedEscapedTitle = formatHeraldPublicationMessage({
  sourceType: "NEWS_MD_ARCHIVE",
  title: "0.0.x <ранній>",
  body: "Тихий запис.",
});
assert.match(archiveFormattedEscapedTitle, /Архівний запис: <b>0\.0\.x &lt;ранній&gt;<\/b>/);
assert.doesNotMatch(archiveFormattedEscapedTitle, /<ранній>/);

const savedSnapshot = formatHeraldPublicationMessage({
  title: "Старий заголовок",
  body: "Старе тіло",
  renderedText: "📜 Збережений відбиток\n\nТекст уже не залежить від news.md",
});
assert.match(savedSnapshot, /Збережений відбиток/);
assert.doesNotMatch(savedSnapshot, /Старе тіло/);

const repost = formatHeraldPublicationRepostMessage({
  id: 77,
  title: "Старий заголовок",
  body: "Старе тіло",
  sourceDate: "12026-05-04",
  renderedText: "📜 Збережений відбиток\n\nТекст уже не залежить від news.md",
});
assert.match(repost, /📜 З архіву Канцелярії/);
assert.match(repost, /Повторна публікація з книги Канцелярії #77/);
assert.match(repost, /Первісна дата запису: 12026-05-04/);
assert.match(repost, /Збережений відбиток/);

const worldDigestFormatted = formatHeraldPublicationMessage({
  title: "🌘 Запис із краю Чорнолісу",
  body: [
    formatWorldDigestDateLine({
      year: 587,
      lunarCircleName: "Коло Зеленого Шуму",
      dayOfCircle: 18,
    }),
    "",
    "Звірі розійшлися ширше, ніж учора.",
    "",
    "У кількох місцинах земля стала уважнішою.",
  ].join("\n"),
});
assert.equal((worldDigestFormatted.match(/Запис із краю Чорнолісу/g) ?? []).length, 1);
assert.match(worldDigestFormatted, /Дата запису: 587 літо після Великого Відступу — рік Сича під Тихим Вітром, Коло Зеленого Шуму, 18 день\./);
assert.match(worldDigestFormatted, /Звірі розійшлися ширше[^\n]*\n\nУ кількох місцинах/);

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

const caller = { id: 101, first_name: "Caller" };
const repliedUser = { id: 202, first_name: "Target" };
assert.equal(resolveHeraldInfoTargetUser({ from: caller })?.id, 101);
assert.equal(resolveHeraldInfoTargetUser({ from: caller, replyToMessage: { from: repliedUser } })?.id, 202);
assert.equal(resolveHeraldInfoTargetUser({ from: caller, replyToMessage: {} }), null);

assert.match(renderHeraldAnonymousInfoTarget(), /бачить знак/);
assert.match(renderHeraldPublicInfoMissing(), /не знайшла певного запису/);

const publicInfo = renderHeraldPublicPlayerInfo({
  nameNominative: "Тестовий Мандрівник",
  firstName: "Тест",
  username: "test",
  steps: 42,
  gatherAttempts: 20,
  berriesGathered: 7,
  mushroomsGathered: 0,
  herbsGathered: 5,
  greetings: 3,
  says: 4,
  restStarts: 1,
  animalsKilled: 2,
});
assert.match(publicInfo, /📜 Запис Канцелярії/);
assert.match(publicInfo, /Тестовий Мандрівник/);
assert.match(publicInfo, /Ліс пам’ятає:/);
assert.match(publicInfo, /Прикмети:/);
assert.doesNotMatch(publicInfo, /Telegram user ID|Chat ID|playerId|id=|Життя|Снага|Остання позначка/);

async function runAsyncChecks() {
  const expectedNewsPath = path.resolve(process.cwd(), "news.md");
  const [archiveRead, latestRead] = await Promise.all([
    readAllNewsEntries(),
    readLatestNewsEntry(),
  ]);

  assert.equal(resolveHeraldNewsPath(), expectedNewsPath);
  assert.equal(archiveRead.ok, true, archiveRead.error);
  assert.equal(latestRead.ok, true, latestRead.error);
  assert.equal(archiveRead.filePath, expectedNewsPath);
  assert.equal(latestRead.filePath, expectedNewsPath);
  assert.equal(latestRead.parsedEntries, archiveRead.parsedEntries);
  assert.equal(latestRead.entry.contentHash, archiveRead.entries[0].contentHash);
}

runAsyncChecks()
  .then(() => {
    console.log("herald smoke tests passed");
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
