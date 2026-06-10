import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { config } from "./config";
import { compactDatabaseQueryError, markDatabaseQueryObserved } from "./runtimeState";

const { Pool } = pg;
const isRenderInternalDb = config.databaseUrl.includes(".internal");

export const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: isRenderInternalDb ? false : { rejectUnauthorized: false },
});

const adapter = new PrismaPg(pool);
const prismaClient = new PrismaClient({ adapter });

export const prisma = prismaClient.$extends({
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        const startedAt = Date.now();
        try {
          const result = await query(args);
          markDatabaseQueryObserved({
            observedAt: new Date(),
            model: model ?? null,
            action: String(operation),
            durationMs: Date.now() - startedAt,
            outcome: "ok",
            error: null,
          });
          return result;
        } catch (error) {
          markDatabaseQueryObserved({
            observedAt: new Date(),
            model: model ?? null,
            action: String(operation),
            durationMs: Date.now() - startedAt,
            outcome: "error",
            error: compactDatabaseQueryError(error),
          });
          throw error;
        }
      },
    },
  },
}) as unknown as PrismaClient;
export type PrismaDb = typeof prisma;
