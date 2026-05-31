const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const WORLD_DATA_DIR = path.join("prisma", "data", "world");
const LEGACY_SEED = path.join("prisma", "data", "chornolis_world_seed.json");
const HTML_TAG_PATTERN = /<\/?[a-z][a-z0-9-]*(?:\s+[^<>]*)?>/i;

function jsonFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return jsonFiles(fullPath);
    return entry.isFile() && entry.name.endsWith(".json") ? [fullPath] : [];
  });
}

function scanStrings(value, location, issues) {
  if (typeof value === "string") {
    if (HTML_TAG_PATTERN.test(value)) issues.push(`${location}: ${value}`);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanStrings(item, `${location}[${index}]`, issues));
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      scanStrings(child, `${location}.${key}`, issues);
    }
  }
}

const files = [...jsonFiles(WORLD_DATA_DIR), LEGACY_SEED].filter((file) => fs.existsSync(file));
const issues = [];

for (const file of files) {
  const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
  scanStrings(parsed, file, issues);
}

assert.deepEqual(issues, [], "World seed/content JSON should not contain raw HTML tags; wrap emphasis in renderers instead.");

console.log("World content HTML guard OK");
