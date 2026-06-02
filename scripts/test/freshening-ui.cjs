const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(path.join(__dirname, "../../src/services/actionCompletions.ts"), "utf8");

assert.equal(source.includes("Здобич освіжовано. Придатне м'ясо забрано."), false);
assert.equal(source.includes("Ви освіжували"), true);

console.log("Freshening UI regression OK");
