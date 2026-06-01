const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

require("ts-node/register");

const { parseAlias } = require("../../src/input/aliases");
const { HERALD_COMMANDS } = require("../../src/herald/help");

const ROOT = path.resolve(__dirname, "../..");
const NEWS_PATH = path.join(ROOT, "news.md");

const NON_BOT_SLASH_REFERENCES = new Set([
  "/api/map.json",
  "/chat.json",
  "/health",
  "/map",
  "/stat.json",
  "/who.json",
]);

const MAIN_COMMAND_SOURCES = [
  path.join(ROOT, "src/handlers"),
  path.join(ROOT, "src/services/worldTick.ts"),
];

function listFiles(target) {
  const stat = fs.statSync(target);
  if (stat.isFile()) return [target];

  return fs.readdirSync(target, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(target, entry.name);
    if (entry.isDirectory()) return listFiles(fullPath);
    return entry.isFile() && /\.(ts|tsx)$/.test(entry.name) ? [fullPath] : [];
  });
}

function extractStringLiterals(text) {
  return [...text.matchAll(/"([^"\\]*(?:\\.[^"\\]*)*)"/g)].map((match) => match[1]);
}

function collectMainBotCommands() {
  const commands = new Set();

  for (const source of MAIN_COMMAND_SOURCES.flatMap(listFiles)) {
    const text = fs.readFileSync(source, "utf8");
    for (const match of text.matchAll(/bot\.command\(\s*(\[[^\)]*?\]|"[^"]+")/gs)) {
      for (const command of extractStringLiterals(match[1])) {
        commands.add(command);
        commands.add(command.toLowerCase());
      }
    }
  }

  return commands;
}

function extractInlineSlashHints(markdown) {
  const hints = [];

  for (const match of markdown.matchAll(/`([^`]+)`/g)) {
    const hint = match[1].trim();
    if (hint.startsWith("/")) hints.push(hint);
  }

  return [...new Set(hints)];
}

function commandNameFromHint(hint) {
  return hint.slice(1).split(/\s+/, 1)[0];
}

const mainCommands = collectMainBotCommands();
const publicHeraldCommands = new Set(
  HERALD_COMMANDS
    .filter((command) => !command.adminOnly)
    .map((command) => command.command.replace(/^\//, "")),
);
const news = fs.readFileSync(NEWS_PATH, "utf8");
const unroutedHints = extractInlineSlashHints(news).filter((hint) => {
  if (NON_BOT_SLASH_REFERENCES.has(hint)) return false;
  if (parseAlias(hint)) return false;

  const command = commandNameFromHint(hint);
  return !mainCommands.has(command) && !mainCommands.has(command.toLowerCase()) && !publicHeraldCommands.has(command);
});

assert.deepEqual(
  unroutedHints,
  [],
  `news.md has clickable slash hints that do not route as main bot commands, public Herald commands, or aliases: ${unroutedHints.join(", ")}`,
);

console.log("News clickable command hints OK");
