const assert = require("node:assert/strict");

require("ts-node/register");

const {
  CHRONICLE_TITLE_PREFIX,
  renderGlobalChronicles,
} = require("../../src/services/chronicles");

assert.equal(CHRONICLE_TITLE_PREFIX, "Chronicle:");

const rendered = renderGlobalChronicles([
  {
    title: "Chronicle: carcass_quest_stopped",
    description: "🦴 Біля падального рову прибили бересту: поки досить.",
    createdAt: new Date("2026-05-31T09:40:00.000Z"),
  },
  {
    title: "Chronicle: new_player",
    description: "👋 Новий слід у Порубіжжі: Ведана.",
    createdAt: new Date("2026-05-30T19:15:00.000Z"),
  },
]);

assert.match(rendered, /^📜 Хроніки Порубіжжя/);
assert.match(rendered, /31 травня/);
assert.match(rendered, /12:40 \| 🦴 Біля падального рову/);
assert.match(rendered, /30 травня/);
assert.match(rendered, /22:15 \| 👋 Новий слід у Порубіжжі: Ведана\./);

assert.match(renderGlobalChronicles([]), /Поки на корі немає свіжих зарубок/);

console.log("Chronicle helpers OK");
