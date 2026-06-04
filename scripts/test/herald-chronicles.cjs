const assert = require("node:assert/strict");

require("ts-node/register");

const {
  HERALD_CHRONICLE_RELAY_MARKER_TITLE,
  chronicleRelayMarkerDescription,
  formatChronicleRelayDisabledReason,
  isChronicleRelayMarkerForEvent,
} = require("../../src/herald/chronicleRelay");

assert.equal(HERALD_CHRONICLE_RELAY_MARKER_TITLE, "Herald chronicle relayed");
assert.equal(chronicleRelayMarkerDescription(42), "chronicleEventId=42");
assert.equal(isChronicleRelayMarkerForEvent("chronicleEventId=42", 42), true);
assert.equal(isChronicleRelayMarkerForEvent("source=relay; chronicleEventId=42", 42), true);
assert.equal(isChronicleRelayMarkerForEvent("chronicleEventId=421", 42), false);
assert.equal(isChronicleRelayMarkerForEvent(null, 42), false);
assert.match(formatChronicleRelayDisabledReason(), /HERALD_CHRONICLE_RELAY_ENABLED is not true/);

console.log("Herald chronicle helpers OK");
