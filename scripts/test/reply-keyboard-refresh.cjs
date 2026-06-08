const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

require("ts-node/register");

const { buildMenuReplyKeyboard } = require("../../src/ui/replyKeyboard");

const root = path.resolve(__dirname, "../..");

function keyboardLabels(keyboard) {
  return keyboard.keyboard.flat().map((button) => button.text ?? button);
}

for (const relativePath of ["src/services/actionLifecycle.ts", "src/services/actionRecovery.ts"]) {
  const source = fs.readFileSync(path.join(root, relativePath), "utf8");
  assert.doesNotMatch(
    source,
    /sendMessage\([^,\n]+,\s*`Стан: \$\{/,
    `${relativePath} must not send standalone status-only keyboard refresh messages`
  );
}

const ordinaryMenuLabels = keyboardLabels(buildMenuReplyKeyboard());
assert.match(ordinaryMenuLabels.join("\n"), /Новини/);
assert.doesNotMatch(ordinaryMenuLabels.join("\n"), /Репліки/);
assert.doesNotMatch(ordinaryMenuLabels.join("\n"), /Статистика/);

const scribeMenuLabels = keyboardLabels(buildMenuReplyKeyboard());
assert.deepEqual(scribeMenuLabels, ordinaryMenuLabels, "ordinary Menu should stay identical for players and scribes");

console.log("Reply keyboard refresh noise guards OK");
