const assert = require("node:assert/strict");

require("ts-node/register");

const {
  TORCH_FADING_WARNING_TEXT,
  TORCH_SOURCE_PLAYER_CARRY_LIMIT,
  canPromptLightAnotherTorch,
  carriedTorchCount,
  decideTorchSourceTake,
  torchSourceTakeBlockedText,
} = require("../../src/services/fire");

assert.equal(carriedTorchCount({ plainAmount: 11, litAmount: 1, dousedAmount: 1 }), 13);
assert.equal(canPromptLightAnotherTorch({ plainAmount: 1, litAmount: 1, dousedAmount: 0 }), true);
assert.equal(canPromptLightAnotherTorch({ plainAmount: 0, litAmount: 1, dousedAmount: 1 }), true);
assert.equal(canPromptLightAnotherTorch({ plainAmount: 0, litAmount: 1, dousedAmount: 0 }), false);
assert.equal(canPromptLightAnotherTorch({ plainAmount: 1, litAmount: 2, dousedAmount: 0 }), false);
assert.match(TORCH_FADING_WARNING_TEXT, /інший факел/);
assert.match(TORCH_FADING_WARNING_TEXT, /від цього полум'я/);
assert.doesNotMatch(TORCH_FADING_WARNING_TEXT, /підпалити його знову/);

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
