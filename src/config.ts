import * as dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

function optionalNumberEnv(name: string) {
  const raw = process.env[name];
  if (!raw) return undefined;
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

function optionalStringEnv(name: string) {
  const raw = process.env[name]?.trim();
  return raw || undefined;
}

function normalizeBaseUrl(value: string) {
  return value.replace(/\/+$/, "");
}

function getAppVersion() {
  try {
    const pkgPath = path.join(process.cwd(), "package.json");
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    return String(pkg.version || process.env.APP_VERSION || "dev");
  } catch {
    return String(process.env.APP_VERSION || "dev");
  }
}

const configuredTickMs = optionalNumberEnv("WORLD_TICK_INTERVAL_MS") ?? optionalNumberEnv("TICK_MS") ?? 1500;
const publicBaseUrl = normalizeBaseUrl(optionalStringEnv("PUBLIC_BASE_URL") ?? "https://chornolis-marches.onrender.com");

export const config = {
  botToken: requireEnv("BOT_TOKEN"),
  databaseUrl: requireEnv("DATABASE_URL"),
  appVersion: getAppVersion(),
  port: Number(process.env.PORT || 3000),
  publicBaseUrl,
  tickMs: Math.max(1000, Math.floor(configuredTickMs)),
};
