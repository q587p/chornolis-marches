#!/usr/bin/env node
import fs from "fs";
import path from "path";

const root = process.cwd();
const splitDir = path.join(root, "prisma", "data", "world");
const legacySeedPath = path.join(root, "prisma", "data", "chornolis_world_seed.json");
const outPath = path.join(root, "docs", "world", "world_map.md");
const write = process.argv.includes("--write");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function loadWorld() {
  if (fs.existsSync(splitDir) && fs.statSync(splitDir).isDirectory()) {
    const resourceRulesPath = path.join(splitDir, "resourceRules.json");
    const world = {
      meta: readJson(path.join(splitDir, "meta.json")),
      regions: readJson(path.join(splitDir, "regions.json")),
      locations: readJson(path.join(splitDir, "locations.json")),
      blockedCells: fs.existsSync(path.join(splitDir, "blockedCells.json")) ? readJson(path.join(splitDir, "blockedCells.json")) : [],
      exits: readJson(path.join(splitDir, "exits.json")),
      resourceTypes: readJson(path.join(splitDir, "resourceTypes.json")),
      resourceNodes: fs.existsSync(path.join(splitDir, "resourceNodes.json")) ? readJson(path.join(splitDir, "resourceNodes.json")) : [],
      features: readJson(path.join(splitDir, "features.json")),
      uniqueCreatures: readJson(path.join(splitDir, "uniqueCreatures.json")),
      sourceLabel: "prisma/data/world/*.json",
    };
    if (fs.existsSync(resourceRulesPath)) world.resourceRules = readJson(resourceRulesPath);
    return world;
  }

  const world = readJson(legacySeedPath);
  world.blockedCells ??= [];
  world.sourceLabel = "prisma/data/chornolis_world_seed.json";
  return world;
}

const world = loadWorld();

function symbolForLocation(location) {
  if (location.key === world.meta?.startLocationKey) return "S";
  if (location.key === "closed_east_gate") return "G";
  if (location.key === "under_bridge_18_05") return "u";
  if (location.regionKey === "old_bridge") return "=";
  if (location.regionKey === "riverbank") return ",";
  if (location.regionKey === "dry_luka") return ".";
  if (location.regionKey === "chornolis_border") return "F";
  return "?";
}

function symbolForBlocked(cell) {
  if (cell.kind === "RIVER") return "~";
  if (String(cell.kind).includes("WALL") || cell.kind === "MAP_BOUNDARY" || cell.kind === "LUKA_EDGE") return "█";
  return "#";
}

function renderLayer(z) {
  const layerLocations = world.locations.filter((location) => (location.z ?? 0) === z);
  const layerBlocked = (world.blockedCells ?? []).filter((cell) => (cell.z ?? 0) === z);
  if (!layerLocations.length && !layerBlocked.length) return "";

  const coords = [...layerLocations, ...layerBlocked];
  const minX = Math.min(...coords.map((item) => item.x));
  const maxX = Math.max(...coords.map((item) => item.x));
  const minY = Math.min(...coords.map((item) => item.y));
  const maxY = Math.max(...coords.map((item) => item.y));
  const locations = new Map(layerLocations.map((location) => [`${location.x},${location.y}`, location]));
  const blocked = new Map(layerBlocked.map((cell) => [`${cell.x},${cell.y}`, cell]));

  const headerCells = [];
  for (let x = minX; x <= maxX; x++) headerCells.push(String(x).padStart(2, " "));
  const lines = [`      ${headerCells.join(" ")}`, "y"];

  for (let y = maxY; y >= minY; y--) {
    const row = [];
    for (let x = minX; x <= maxX; x++) {
      const key = `${x},${y}`;
      if (locations.has(key)) row.push(` ${symbolForLocation(locations.get(key))}`);
      else if (blocked.has(key)) row.push(` ${symbolForBlocked(blocked.get(key))}`);
      else row.push("  ");
    }
    lines.push(`${String(y).padStart(3, " ")}   ${row.join(" ")}`.replace(/\s+$/u, ""));
  }

  return lines.join("\n");
}

const locationsByKey = new Map(world.locations.map((location) => [location.key, location]));
const specialLinks = world.exits
  .filter((exit) => {
    const from = locationsByKey.get(exit.fromKey);
    const to = locationsByKey.get(exit.toKey);
    if (!from || !to) return false;
    const dx = Math.abs(from.x - to.x);
    const dy = Math.abs(from.y - to.y);
    const dz = Math.abs((from.z ?? 0) - (to.z ?? 0));
    return dx + dy + dz > 1 || dz > 0;
  })
  .map((exit) => `- \`${exit.fromKey}\` — ${exit.direction} → \`${exit.toKey}\``)
  .join("\n");

const content = `# World Map

Generated from \`${world.sourceLabel}\`.

To refresh this file after editing the seed data, run:

\`\`\`bash
node scripts/world/render-map-ascii.mjs --write
\`\`\`

## Legend

- \`F\` — forest location.
- \`.\` — dry luka / open meadow location.
- \`,\` — riverbank location.
- \`~\` — impassable river cell.
- \`#\` — local impassable thicket / obstacle.
- \`█\` — impassable outer boundary.
- \`S\` — start / \`/respawn\`, border marker and unfading campfire.
- \`=\` — old bridge.
- \`G\` — closed settlement gate.
- \`u\` — under-bridge location at \`z = -1\`; it is not connected to the bridge deck.

## Layer z = 0

\`\`\`text
${renderLayer(0)}
\`\`\`

## Layer z = -1

\`\`\`text
${renderLayer(-1)}
\`\`\`

## Special authored links

${specialLinks || "- None."}

## Editing

See [Map Editing](./map_editing.md) for the short manual editing guide.
`;

if (write) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, content, "utf-8");
  console.log(`Wrote ${outPath}`);
} else {
  process.stdout.write(content);
}
