const assert = require("node:assert/strict");

require("ts-node/register");

const {
  OLD_CAMPFIRE_MEMORY_OMENS,
  canRevealOldCampfireMemory,
  oldCampfireMemoryInspectionText,
  oldCampfireMemoryOmen,
} = require("../../src/services/fire");

const oldCampfire = {
  key: "forest_old_campfire_02_02",
  type: "CAMPFIRE",
  data: { is_campfire: true, seeded: true, extinguished: true },
};

assert.equal(OLD_CAMPFIRE_MEMORY_OMENS.length, 3);
assert.equal(canRevealOldCampfireMemory(oldCampfire), true);
assert.equal(OLD_CAMPFIRE_MEMORY_OMENS.includes(oldCampfireMemoryOmen(oldCampfire)), true);
assert.equal(oldCampfireMemoryOmen(oldCampfire), oldCampfireMemoryOmen(oldCampfire));

assert.equal(canRevealOldCampfireMemory({
  key: "debug_campfire_1",
  type: "CAMPFIRE",
  data: { is_campfire: true, debug: true },
}), false);

assert.equal(canRevealOldCampfireMemory({
  key: "start_unfading_campfire",
  type: "MAGIC_CAMPFIRE",
  data: { is_campfire: true, seeded: true },
}), false);

assert.equal(canRevealOldCampfireMemory({
  ...oldCampfire,
  data: { ...oldCampfire.data, oldCampfireMemoryRevealedAt: "12026-05-30T00:00:00.000Z" },
}), false);

assert.equal(oldCampfireMemoryInspectionText({
  type: "CAMPFIRE",
  data: { oldCampfireMemoryText: "Попіл уже показав старий знак." },
}), "Попіл уже показав старий знак.");

assert.equal(oldCampfireMemoryInspectionText({
  type: "MAGIC_CAMPFIRE",
  data: { oldCampfireMemoryText: "Не показувати для магічного вогнища." },
}), null);

console.log("Campfire memory helpers OK");
