const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");

for (const relativePath of ["src/services/actionLifecycle.ts", "src/services/actionRecovery.ts"]) {
  const source = fs.readFileSync(path.join(root, relativePath), "utf8");
  assert.doesNotMatch(
    source,
    /sendMessage\([^,\n]+,\s*`Стан: \$\{/,
    `${relativePath} must not send standalone status-only keyboard refresh messages`
  );
}

console.log("Reply keyboard refresh noise guards OK");
