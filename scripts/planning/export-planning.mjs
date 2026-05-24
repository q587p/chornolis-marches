import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");
const itemsDir = path.join(root, "docs/planning/items");
const exportsDir = path.join(root, "docs/planning/exports");

function parseScalar(value) {
  const trimmed = value.trim();
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (trimmed === "[]") return [];
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseFrontMatter(text, file) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) throw new Error(`${file} is missing YAML front matter`);

  const meta = {};
  const lines = match[1].split(/\r?\n/);
  let currentKey = null;
  let currentObjectKey = null;

  for (const rawLine of lines) {
    if (!rawLine.trim()) continue;

    const listItem = rawLine.match(/^\s+-\s+(.+)$/);
    if (listItem && currentKey) {
      if (!Array.isArray(meta[currentKey])) meta[currentKey] = [];
      meta[currentKey].push(parseScalar(listItem[1]));
      continue;
    }

    const nestedPair = rawLine.match(/^\s+([A-Za-z0-9_-]+):\s*(.*)$/);
    if (nestedPair && currentObjectKey) {
      meta[currentObjectKey][nestedPair[1]] = parseScalar(nestedPair[2]);
      continue;
    }

    const pair = rawLine.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!pair) throw new Error(`${file} has unsupported front matter line: ${rawLine}`);

    const [, key, value] = pair;
    currentKey = key;
    currentObjectKey = null;

    if (value === "") {
      const nextNonEmpty = lines.slice(lines.indexOf(rawLine) + 1).find((line) => line.trim());
      meta[key] = nextNonEmpty?.startsWith("  - ") ? [] : {};
      if (!nextNonEmpty?.startsWith("  - ")) currentObjectKey = key;
    } else {
      meta[key] = parseScalar(value);
    }
  }

  return { meta, body: match[2] };
}

function titleFromBody(body, id, fallback) {
  const heading = body.match(/^#\s+(.+)$/m)?.[1]?.trim();
  if (!heading) return fallback ?? id;
  return heading.startsWith(`${id}:`) ? heading.slice(id.length + 1).trim() : heading;
}

function csvValue(value) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

const files = (await readdir(itemsDir))
  .filter((file) => file.endsWith(".md") && file.toLowerCase() !== "readme.md")
  .sort((a, b) => a.localeCompare(b));

const items = [];

for (const fileName of files) {
  const absolute = path.join(itemsDir, fileName);
  const text = await readFile(absolute, "utf8");
  const { meta, body } = parseFrontMatter(text, fileName);
  const relativeFile = path.relative(root, absolute).replace(/\\/g, "/");
  const id = meta.id;
  if (!id) throw new Error(`${fileName} is missing required id`);

  items.push({
    id,
    title: meta.title ?? titleFromBody(body, id, fileName.replace(/\.md$/, "")),
    status: meta.status ?? "idea",
    type: meta.type ?? "feature",
    area: meta.area ?? "uncategorized",
    priority: meta.priority ?? "medium",
    tags: Array.isArray(meta.tags) ? meta.tags : [],
    depends_on: Array.isArray(meta.depends_on) ? meta.depends_on : [],
    exports: meta.exports && !Array.isArray(meta.exports) ? meta.exports : {},
    file: relativeFile,
  });
}

items.sort((a, b) => a.id.localeCompare(b.id));

const csvHeader = ["id", "title", "status", "type", "area", "priority", "tags", "file"];
const csvRows = items.map((item) => [
  item.id,
  item.title,
  item.status,
  item.type,
  item.area,
  item.priority,
  item.tags.join(","),
  item.file,
]);

await mkdir(exportsDir, { recursive: true });
await writeFile(path.join(exportsDir, "items.json"), `${JSON.stringify(items, null, 2)}\n`);
await writeFile(path.join(exportsDir, "issues.csv"), `${[csvHeader, ...csvRows].map((row) => row.map(csvValue).join(",")).join("\n")}\n`);

console.log(`Exported ${items.length} planning items.`);
