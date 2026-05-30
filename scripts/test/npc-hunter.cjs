const assert = require("node:assert/strict");

require("ts-node/register");

const {
  buildHunterRoutePlan,
  HUNTER_DEFAULT_MAGIC_CAMPFIRE_FEATURE_KEY,
  HUNTER_CARRIED_TORCH_PREFIX,
  HUNTER_GROUND_TORCH_KEYS,
  HUNTER_PROFESSION_KEY,
  HUNTER_RETURN_TORCH_RESERVE,
  HUNTER_RETURNING_FOR_TORCHES_MARKER,
  HUNTER_TORCH_BUNDLE_SIZE,
  groupHunterClaimedCorpses,
  hunterCarriedTorchCount,
  hunterClaimedCorpseAction,
  hunterClaimedCorpseOwnerId,
  hunterIsReturningForTorches,
  hunterReturningForTorchesAction,
  hunterRouteDirections,
  hunterTorchCarryAction,
  isHunterGroundTorchKey,
  isHunterCreature,
  sortHunterPreyCandidates,
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
assert.equal(torchAction.includes(HUNTER_CARRIED_TORCH_PREFIX), false);
assert.equal(hunterCarriedTorchCount(`${torchAction}; ${HUNTER_CARRIED_TORCH_PREFIX}3`), 3);
assert.equal(hunterCarriedTorchCount("підбирає факел до мисливського набору"), 0);
assert.equal(hunterCarriedTorchCount(null), 0);

const returningForTorches = hunterReturningForTorchesAction();
assert.ok(returningForTorches.includes(HUNTER_RETURNING_FOR_TORCHES_MARKER));
assert.equal(hunterIsReturningForTorches(returningForTorches), true);
assert.equal(returningForTorches.includes(HUNTER_CARRIED_TORCH_PREFIX), false);
assert.equal(hunterIsReturningForTorches("поповнює мисливський набір біля воріт"), false);

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

const sortedPrey = sortHunterPreyCandidates([
  { id: 1, age: "CHILD", hp: 1, species: { key: "mouse" } },
  { id: 2, age: "YOUNG", hp: 1, species: { key: "mouse" } },
  { id: 3, age: "OLD", hp: 1, species: { key: "mouse" } },
  { id: 4, age: "ADULT", hp: 99, species: { key: "rabbit" } },
  { id: 5, age: "ADULT", hp: 3, species: { key: "mouse" } },
]);
assert.deepEqual(sortedPrey.map((target) => target.id), [5, 4, 3, 2]);
assert.equal(sortedPrey.some((target) => target.age === "CHILD"), false);

console.log("NPC hunter helpers OK");
