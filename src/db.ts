import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { config } from "./config";

const { Pool } = pg;
const isRenderInternalDb = config.databaseUrl.includes(".internal");

export const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: isRenderInternalDb ? false : { rejectUnauthorized: false },
});

const adapter = new PrismaPg(pool);
export const prisma = new PrismaClient({ adapter });
export type PrismaDb = typeof prisma;
