import fs from "fs";
import path from "path";
import { prisma } from "../db";

const FALLBACK_START_LOCATION_KEY = "start_border_camp";

type SeedMeta = {
  startLocationKey?: string;
};

function readStartLocationKeyFromJson(filePath: string): string | undefined {
  try {
    if (!fs.existsSync(filePath)) return undefined;
    const raw = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(raw) as SeedMeta | { meta?: SeedMeta };
    if (typeof parsed === "object" && parsed !== null && "meta" in parsed) return parsed.meta?.startLocationKey;
    return (parsed as SeedMeta).startLocationKey;
  } catch {
    return undefined;
  }
}

function getConfiguredStartLocationKey() {
  const root = process.cwd();
  return (
    readStartLocationKeyFromJson(path.join(root, "prisma", "data", "world", "meta.json")) ??
    readStartLocationKeyFromJson(path.join(root, "prisma", "data", "chornolis_world_seed.json")) ??
    FALLBACK_START_LOCATION_KEY
  );
}

export const START_LOCATION_KEY = getConfiguredStartLocationKey();

export async function getStartLocationId() {
  const location = await prisma.cellLocation.findUnique({ where: { key: START_LOCATION_KEY } });
  if (!location) throw new Error(`Start location "${START_LOCATION_KEY}" not found. Run npm run seed first.`);
  return location.id;
}

export async function getPlayerByTelegramId(telegramId: number) {
  return prisma.player.findUnique({ where: { telegramId: String(telegramId) } });
}
