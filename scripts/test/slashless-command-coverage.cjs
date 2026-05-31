const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

function tsFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return tsFiles(fullPath);
    return fullPath.endsWith(".ts") ? [fullPath] : [];
  });
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function commandNamesFromSource(source) {
  const names = [];
  const commandCall = /bot\.command\(([^\n;]+?)\s*,/gs;
  let match;
  while ((match = commandCall.exec(source))) {
    const expression = match[1].trim();
    if (expression.startsWith("[")) {
      for (const item of expression.matchAll(/"([^"]+)"|'([^']+)'/g)) names.push(item[1] || item[2]);
      continue;
    }

    const literal = expression.match(/"([^"]+)"|'([^']+)'/);
    if (literal) names.push(literal[1] || literal[2]);
  }
  return names;
}

const commandFiles = [...tsFiles("src/handlers"), "src/services/worldTick.ts"];
const inputAliasesSource = fs.readFileSync("src/input/aliases.ts", "utf8");
const combinedSource = `${inputAliasesSource}\n${commandFiles.map((file) => fs.readFileSync(file, "utf8")).join("\n")}`;

// These are intentionally covered by shorter exact aliases or equivalent text forms.
const equivalentAliases = new Set([
  "n",
  "s",
  "e",
  "w",
  "u",
  "d",
  "in",
  "out",
  "loc",
  "location",
  "stats",
  "quit",
  "leave",
  "sleep_tutorial",
  "wakeup",
  "open",
  "skasuvaty",
  "vidminyty",
  "tick",
]);

const missing = [];

for (const file of commandFiles) {
  const source = fs.readFileSync(file, "utf8");
  for (const command of commandNamesFromSource(source)) {
    if (equivalentAliases.has(command)) continue;

    const escaped = escapeRegExp(command);
    const directInputAlias = new RegExp(`(^|[^A-Za-z0-9_])${escaped}([^A-Za-z0-9_]|$)`).test(inputAliasesSource);
    const slashlessHelper = new RegExp(`slashlessCommandPattern\\(\\[[^\\]]*["']${escaped}["']`, "i").test(combinedSource);
    const directHears = new RegExp(`bot\\.hears\\([^;]*["']${escaped}["']`, "i").test(combinedSource);

    if (!directInputAlias && !slashlessHelper && !directHears) missing.push(`${command} (${file})`);
  }
}

assert.deepEqual(missing, []);

console.log("Slashless command coverage OK");
