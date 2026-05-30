const assert = require("node:assert/strict");

require("ts-node/register");

const {
  buildHunterRoutePlan,
  HUNTER_DEFAULT_MAGIC_CAMPFIRE_FEATURE_KEY,
  HUNTER_GROUND_TORCH_KEYS,
  HUNTER_PROFESSION_KEY,
  HUNTER_RETURN_TORCH_RESERVE,
  HUNTER_TORCH_BUNDLE_SIZE,
  groupHunterClaimedCorpses,
  hunterCarriedTorchCount,
  hunterClaimedCorpseAction,
  hunterClaimedCorpseOwnerId,
  hunterRouteDirections,
  hunterTorchCarryAction,
  isHunterGroundTorchKey,
  isHunterCreature,
} = require("../../src/services/npcHunter");

const toCampfire = [
  { fromLocationId: 10, toLocationId: 11, direction: "WEST", travelCost: 1 },
  { fromLocationId: 11, toLocationId: 12, direction: "SOUTH", travelCost: 2 },
];
const toGate = [
  { fromLocationId: 12, toLocationId: 11, direction: "NORTH", travelCost: 2 },
  { fromLocationId: 11, toLocationId: 10, direction: "EAST", travelCost: 1 },
];

const plan = buildHunterRoutePlan({
  gateLocationId: 10,
  campfireLocationId: 12,
  toCampfire,
  toGate,
});

assert.equal(plan.ok, true);
assert.equal(plan.plan.dropoffFeatureKey, "closed_gate_carcass_dropoff");
assert.equal(plan.plan.campfireFeatureKey, HUNTER_DEFAULT_MAGIC_CAMPFIRE_FEATURE_KEY);
assert.deepEqual(hunterRouteDirections(plan.plan.toCampfire), ["WEST", "SOUTH"]);
assert.deepEqual(hunterRouteDirections(plan.plan.toGate), ["NORTH", "EAST"]);
assert.equal(plan.plan.totalTravelCost, 6);

assert.deepEqual(buildHunterRoutePlan({
  gateLocationId: 10,
  campfireLocationId: 12,
  toCampfire: null,
  toGate,
}), { ok: false, reason: "no-route-to-campfire" });

assert.deepEqual(buildHunterRoutePlan({
  gateLocationId: 10,
  campfireLocationId: 12,
  toCampfire,
  toGate: null,
}), { ok: false, reason: "no-route-to-gate" });

assert.equal(HUNTER_TORCH_BUNDLE_SIZE, 5);
assert.equal(HUNTER_RETURN_TORCH_RESERVE, 1);
assert.equal(HUNTER_PROFESSION_KEY, "hunter");
assert.deepEqual(HUNTER_GROUND_TORCH_KEYS, ["torch", "lit_torch"]);
assert.equal(isHunterGroundTorchKey("torch"), true);
assert.equal(isHunterGroundTorchKey("lit_torch"), true);
assert.equal(isHunterGroundTorchKey("twigs"), false);

const torchAction = hunterTorchCarryAction(3, "факел", 2);
assert.match(torchAction, /^підбирає факел ×2 до мисливського набору/);
assert.equal(hunterCarriedTorchCount(torchAction), 3);
assert.equal(hunterCarriedTorchCount(hunterTorchCarryAction(99, "факел", 1)), HUNTER_TORCH_BUNDLE_SIZE);
assert.equal(hunterCarriedTorchCount("підбирає факел до мисливського набору"), 0);
assert.equal(hunterCarriedTorchCount(null), 0);

const claimText = hunterClaimedCorpseAction(42);
assert.equal(hunterClaimedCorpseOwnerId(claimText), 42);
assert.equal(hunterClaimedCorpseOwnerId("лежить нерухомо"), null);
assert.equal(isHunterCreature({ professionKey: "hunter" }), true);
assert.equal(isHunterCreature({ professionKey: "znakhar" }), false);

const claimedGroups = groupHunterClaimedCorpses([
  { id: 1, sex: "MALE", species: { key: "rabbit", name: "заєць", nameGenitive: "зайця" } },
  { id: 2, sex: "FEMALE", species: { key: "rabbit", name: "заєць", nameGenitive: "зайця" } },
  { id: 3, sex: null, species: { key: "mouse", name: "миша", nameGenitive: "миші" } },
]);
assert.deepEqual(claimedGroups, [
  { resourceTypeKey: "corpse_rabbit_male", amount: 1, corpseIds: [1] },
  { resourceTypeKey: "corpse_rabbit_female", amount: 1, corpseIds: [2] },
  { resourceTypeKey: "corpse_mouse", amount: 1, corpseIds: [3] },
]);

console.log("NPC hunter helpers OK");
