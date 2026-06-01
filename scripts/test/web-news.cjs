const assert = require("node:assert/strict");

require("ts-node/register");

const { readWebNewsEntries, renderNewsPage } = require("../../src/server/statusServer");

(async () => {
  const entries = await readWebNewsEntries();
  assert.ok(entries.length > 1, "news.md should contain an archive-worthy history");

  const latestHtml = await renderNewsPage("/news");
  assert.match(latestHtml, /id="archive"/);
  assert.match(latestHtml, /href="\/news\?entry=1"/);
  assert.match(latestHtml, /<strong>[^<]+<\/strong>/);

  const olderHtml = await renderNewsPage("/news?entry=1");
  assert.match(olderHtml, /href="\/news"/);
  assert.match(olderHtml, /href="\/news\?entry=2"/);
  assert.match(olderHtml, new RegExp(entries[1].title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));

  const clampedHtml = await renderNewsPage("/news?entry=999999");
  assert.match(clampedHtml, new RegExp(entries.at(-1).title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));

  console.log("Web news archive OK");
})();
