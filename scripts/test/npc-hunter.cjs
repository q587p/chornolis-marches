const assert = require("node:assert/strict");

require("ts-node/register");

const {
  buildHunterRoutePlan,
  HUNTER_DEFAULT_MAGIC_CAMPFIRE_FEATURE_KEY,
  HUNTER_RETURN_TORCH_RESERVE,
  HUNTER_TORCH_BUNDLE_SIZE,
  hunterRouteDirections,
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

console.log("NPC hunter helpers OK");
