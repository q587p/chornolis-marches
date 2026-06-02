const assert = require("node:assert/strict");

require("ts-node/register");

const { buildNewsIndexPage, parseNewsListPageRequest } = require("../../src/handlers/news");
const { readWebNewsEntries, renderNewsInlineMarkdown, renderNewsPage } = require("../../src/server/statusServer");
const { escapeHtml } = require("../../src/utils/text");

function literalPattern(value) {
  return new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
}

(async () => {
  const entries = await readWebNewsEntries();
  assert.ok(entries.length > 1, "news.md should contain an archive-worthy history");

  const latestHtml = await renderNewsPage("/news");
  assert.match(latestHtml, /id="archive"/);
  assert.match(latestHtml, /href="\/news\?entry=1"/);
  assert.match(latestHtml, /<strong>[^<]+<\/strong>/);
  assert.doesNotMatch(latestHtml, /`\/examine`/);

  const olderHtml = await renderNewsPage("/news?entry=1");
  assert.match(olderHtml, /href="\/news"/);
  assert.match(olderHtml, /href="\/news\?entry=2"/);
  assert.match(olderHtml, literalPattern(escapeHtml(entries[1].title)));
  assert.match(olderHtml, /<a class="game-command" href="https:\/\/t\.me\/Chornolis_bot\?start=cmd_examine"><em>\/examine<\/em><\/a>/);

  const clampedHtml = await renderNewsPage("/news?entry=999999");
  assert.match(clampedHtml, literalPattern(escapeHtml(entries.at(-1).title)));

  assert.equal(parseNewsListPageRequest("/news"), 0);
  assert.equal(parseNewsListPageRequest("/news 6"), 5);
  assert.equal(parseNewsListPageRequest("/news@Chornolis_bot 6"), 5);
  assert.equal(parseNewsListPageRequest("/news 0"), 0);

  const deepPage = await buildNewsIndexPage(5);
  const buttons = deepPage.keyboard?.inline_keyboard.flat().map((button) => ({
    text: button.text,
    callback: "callback_data" in button ? button.callback_data : undefined,
  })) ?? [];
  assert.match(deepPage.text, /Архів новин: 41-48 з/);
  assert.match(deepPage.text, /Можна перейти одразу: \/news 6\./);
  assert.ok(buttons.some((button) => button.text === "⏮️ Початок" && button.callback === "news:list:0"), "deep news archive page should link to the first page");
  assert.ok(buttons.some((button) => button.text === "◀️ Назад" && button.callback === "news:list:4"), "deep news archive page should link to the previous page");
  assert.ok(buttons.some((button) => button.text.match(/^\d+\/\d+$/) && button.callback === "news:list:noop"), "deep news archive page should show a noop page indicator");
  assert.ok(buttons.some((button) => button.text === "Далі ▶️" && button.callback === "news:list:6"), "deep news archive page should link to the next page");
  assert.ok(buttons.some((button) => button.text === "Кінець ⏭️" && button.callback), "deep news archive page should link to the last page");

  assert.equal(
    renderNewsInlineMarkdown("`Гукнути поруч` (`/yell`) `/say` `/build_campfire` `/light_campfire` `/douse_campfire` `/dismantle_campfire` /cleanupCreatures /unknown"),
    '<em>Гукнути поруч</em> (<a class="game-command" href="https://t.me/Chornolis_bot?start=cmd_yell"><em>/yell</em></a>) <a class="game-command" href="https://t.me/Chornolis_bot?start=cmd_say"><em>/say</em></a> <a class="game-command" href="https://t.me/Chornolis_bot?start=cmd_build_campfire"><em>/build_campfire</em></a> <a class="game-command" href="https://t.me/Chornolis_bot?start=cmd_light_campfire"><em>/light_campfire</em></a> <a class="game-command" href="https://t.me/Chornolis_bot?start=cmd_douse_campfire"><em>/douse_campfire</em></a> <a class="game-command" href="https://t.me/Chornolis_bot?start=cmd_dismantle_campfire"><em>/dismantle_campfire</em></a> /cleanupCreatures /unknown',
  );

  console.log("Web news archive OK");
})();
