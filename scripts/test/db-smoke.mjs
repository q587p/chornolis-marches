import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import pg from "pg";

dotenv.config();

const root = process.cwd();
const meta = JSON.parse(fs.readFileSync(path.join(root, "prisma", "data", "world", "meta.json"), "utf8"));
const startLocationKey = meta.startLocationKey ?? "start_border_camp";

function fail(message) {
  console.error(`Database smoke failed: ${message}`);
  process.exitCode = 1;
}

if (!process.env.DATABASE_URL) {
  fail("DATABASE_URL is not set");
  process.exit();
}

const { Pool } = pg;
const isRenderInternalDb = process.env.DATABASE_URL.includes(".internal");
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isRenderInternalDb ? false : { rejectUnauthorized: false },
});

try {
  const startLocation = await pool.query('select id, key from "CellLocation" where key = $1 limit 1', [startLocationKey]);
  if (startLocation.rowCount === 0) {
    fail(`start location "${startLocationKey}" was not found in the current database. Run npm run seed after migrations.`);
    process.exit();
  }

  const counts = await pool.query(`
    select
      (select count(*)::int from "Region") as regions,
      (select count(*)::int from "CellLocation") as locations,
      (select count(*)::int from "LocationExit") as exits
  `);
  const row = counts.rows[0];
  if (row.regions <= 0) fail("no regions found in the current database");
  if (row.locations <= 0) fail("no locations found in the current database");
  if (row.exits <= 0) fail("no exits found in the current database");
  if (process.exitCode) process.exit();

  console.log(`Database smoke OK: start=${startLocationKey}, locations=${row.locations}, exits=${row.exits}`);
} finally {
  await pool.end();
}
