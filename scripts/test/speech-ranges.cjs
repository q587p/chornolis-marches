const assert = require("node:assert/strict");

require("ts-node/register");

const {
  nearbySpeechDirectionIntro,
  nearbySpeechRecipients,
} = require("../../src/services/speechRanges");

const recipients = nearbySpeechRecipients(10, [
  { toLocationId: 11, direction: "UP", isHidden: false },
  { toLocationId: 12, direction: "WEST", isHidden: false },
  { toLocationId: 13, direction: "EAST", isHidden: true },
  { toLocationId: 11, direction: "DOWN", isHidden: false },
]);

assert.deepEqual(recipients, [
  { locationId: 10 },
  { locationId: 11, fromDirection: "UP" },
  { locationId: 12, fromDirection: "WEST" },
]);

assert.equal(nearbySpeechDirectionIntro("UP"), "Знизу долинає голос");
assert.equal(nearbySpeechDirectionIntro("DOWN"), "Згори долинає голос");
assert.equal(nearbySpeechDirectionIntro("NORTH"), "З півдня долинає голос");
assert.equal(nearbySpeechDirectionIntro("WEST"), "Зі сходу долинає голос");
assert.equal(nearbySpeechDirectionIntro(undefined), "Зовсім поруч долинає голос");

console.log("Speech range helpers OK");
