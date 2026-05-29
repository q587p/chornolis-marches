const assert = require("node:assert/strict");

require("ts-node/register");

const { findRouteInGraph } = require("../../src/services/routeFinding");

const exits = [
  { fromLocationId: 1, toLocationId: 2, direction: "EAST", travelCost: 1, isHidden: false },
  { fromLocationId: 2, toLocationId: 3, direction: "EAST", travelCost: 2, isHidden: false },
  { fromLocationId: 1, toLocationId: 4, direction: "NORTH", travelCost: 1, isHidden: false },
  { fromLocationId: 4, toLocationId: 5, direction: "EAST", travelCost: 1, isHidden: false },
  { fromLocationId: 3, toLocationId: 6, direction: "SOUTH", travelCost: 1, isHidden: true },
  { fromLocationId: 5, toLocationId: 6, direction: "SOUTH", travelCost: 1, isHidden: false },
];

assert.deepEqual(findRouteInGraph(exits, 1, 3), [
  { fromLocationId: 1, toLocationId: 2, direction: "EAST", travelCost: 1 },
  { fromLocationId: 2, toLocationId: 3, direction: "EAST", travelCost: 2 },
]);

assert.equal(findRouteInGraph(exits, 6, 1), null);

assert.deepEqual(findRouteInGraph(exits, 3, 6), null);
assert.deepEqual(findRouteInGraph(exits, 3, 6, { allowHidden: true }), [
  { fromLocationId: 3, toLocationId: 6, direction: "SOUTH", travelCost: 1 },
]);

assert.deepEqual(findRouteInGraph(exits, 1, 3, { blockedExits: [{ fromLocationId: 1, direction: "EAST" }] }), null);
assert.deepEqual(findRouteInGraph(exits, 1, 6, { blockedExits: ["3:SOUTH"] }), [
  { fromLocationId: 1, toLocationId: 4, direction: "NORTH", travelCost: 1 },
  { fromLocationId: 4, toLocationId: 5, direction: "EAST", travelCost: 1 },
  { fromLocationId: 5, toLocationId: 6, direction: "SOUTH", travelCost: 1 },
]);

assert.deepEqual(findRouteInGraph(exits, 1, 1), []);
assert.equal(findRouteInGraph(exits, 1, 6, { maxDepth: 1 }), null);

console.log("Route finding OK");
