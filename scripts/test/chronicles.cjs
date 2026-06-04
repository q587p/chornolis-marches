const assert = require("node:assert/strict");

require("ts-node/register");

const {
  START_WORLD_ABSOLUTE_MINUTE,
} = require("../../src/data/worldClock");

const {
  CHRONICLE_TITLE_PREFIX,
  absoluteMinuteForChronicleEvent,
  renderGlobalChronicles,
} = require("../../src/services/chronicles");

assert.equal(CHRONICLE_TITLE_PREFIX, "Chronicle:");

const chronicleEvents = [
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
];

const rendered = renderGlobalChronicles(chronicleEvents, { mode: "real" });

assert.match(rendered, /^📜 Хроніки Порубіжжя/);
assert.match(rendered, /31 травня/);
assert.match(rendered, /12:40 \| 🦴 Біля падального рову/);
assert.match(rendered, /30 травня/);
assert.match(rendered, /22:15 \| 👋 Новий слід у Порубіжжі: Ведана\./);

assert.match(renderGlobalChronicles([]), /Поки на корі немає свіжих зарубок/);

const worldState = {
  absoluteMinute: START_WORLD_ABSOLUTE_MINUTE,
  lastAdvancedAt: new Date("2026-05-31T09:40:00.000Z"),
  weatherKey: "cloudy",
  weatherIntensity: 35,
};
const worldRendered = renderGlobalChronicles(chronicleEvents.slice(0, 1), { mode: "world", worldState });
assert.match(worldRendered, /Коло Зеленого Шуму, день 17/);
assert.match(worldRendered, /17:00 \| 🦴 Біля падального рову/);
assert.doesNotMatch(worldRendered, /31 травня/);

assert.equal(
  absoluteMinuteForChronicleEvent(new Date("2026-05-31T09:42:00.000Z"), worldState, 2000),
  START_WORLD_ABSOLUTE_MINUTE + 60,
);

console.log("Chronicle helpers OK");
