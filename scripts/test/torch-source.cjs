const assert = require("node:assert/strict");

require("ts-node/register");

const {
  TORCH_SOURCE_PLAYER_CARRY_LIMIT,
  carriedTorchCount,
  decideTorchSourceTake,
  torchSourceTakeBlockedText,
} = require("../../src/services/fire");

assert.equal(carriedTorchCount({ plainAmount: 11, litAmount: 1, dousedAmount: 1 }), 13);

assert.deepEqual(
  decideTorchSourceTake({ carriedCount: 12, recentTakenCount: 12 }),
  { ok: true },
);

assert.deepEqual(
  decideTorchSourceTake({ carriedCount: TORCH_SOURCE_PLAYER_CARRY_LIMIT, recentTakenCount: 0 }),
  { ok: false, reason: "carry-limit" },
);

assert.deepEqual(
  decideTorchSourceTake({ carriedCount: 0, recentTakenCount: TORCH_SOURCE_PLAYER_CARRY_LIMIT }),
  { ok: false, reason: "recent-window" },
);

assert.match(torchSourceTakeBlockedText("carry-limit"), /Факелів у вас уже досить/);
assert.match(torchSourceTakeBlockedText("recent-window"), /Ви вже набрали факелів нещодавно/);

console.log("Torch source limits OK");
