const assert = require("node:assert/strict");

require("ts-node/register");

const {
  OLD_CAMPFIRE_MEMORY_OMENS,
  TORCH_DURATION_MS,
  canRevealOldCampfireMemory,
  isActiveGroundLitTorchResource,
  litTorchExpiresAt,
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

const now = new Date("2026-05-31T10:00:00.000Z");
const freshGroundTorch = {
  amount: 2,
  updatedAt: new Date(now.getTime() - 60_000),
  resourceType: { key: "lit_torch" },
};
assert.equal(isActiveGroundLitTorchResource(freshGroundTorch, now), true);
assert.equal(litTorchExpiresAt(freshGroundTorch).getTime(), freshGroundTorch.updatedAt.getTime() + TORCH_DURATION_MS);
assert.equal(isActiveGroundLitTorchResource({
  ...freshGroundTorch,
  updatedAt: new Date(now.getTime() - TORCH_DURATION_MS - 1),
}, now), false);
assert.equal(isActiveGroundLitTorchResource({
  ...freshGroundTorch,
  resourceType: { key: "torch" },
}, now), false);
assert.equal(isActiveGroundLitTorchResource({
  ...freshGroundTorch,
  amount: 0,
}, now), false);

console.log("Campfire memory helpers OK");
