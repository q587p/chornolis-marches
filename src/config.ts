import * as dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

export function requireConfigValue(value: string | undefined, name: string) {
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

function optionalBooleanEnv(name: string) {
  const raw = optionalStringEnv(name)?.toLowerCase();
  if (!raw) return undefined;
  if (["1", "true", "yes", "on"].includes(raw)) return true;
  if (["0", "false", "no", "off"].includes(raw)) return false;
  return undefined;
}

function normalizeBaseUrl(value: string) {
  return value.replace(/\/+$/, "");
}

function optionalStringListEnv(name: string) {
  return (process.env[name] ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
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
const configuredAutoAfkMinutes = optionalNumberEnv("AUTO_AFK_AFTER_MINUTES") ?? 15;
const heraldBotToken = optionalStringEnv("HERALD_BOT_TOKEN");
const configuredHeraldEnabled = optionalBooleanEnv("HERALD_ENABLED");
const configuredHeraldPublishIntervalMs = optionalNumberEnv("HERALD_PUBLISH_INTERVAL_MS") ?? 30_000;
const publicBaseUrl = normalizeBaseUrl(optionalStringEnv("PUBLIC_BASE_URL") ?? "https://chornolis-marches.onrender.com");

export const config = {
  botToken: optionalStringEnv("BOT_TOKEN"),
  databaseUrl: requireEnv("DATABASE_URL"),
  appVersion: getAppVersion(),
  port: Number(process.env.PORT || 3000),
  publicBaseUrl,
  tickMs: Math.max(1000, Math.floor(configuredTickMs)),
  autoAfkAfterMinutes: Math.max(1, Math.floor(configuredAutoAfkMinutes)),
  adminTelegramIds: optionalStringListEnv("ADMIN_TELEGRAM_IDS"),
  adminSetSecret: optionalStringEnv("ADMIN_SET_SECRET"),
  heraldEnabled: configuredHeraldEnabled ?? Boolean(heraldBotToken),
  heraldBotToken,
  heraldChannelId: optionalStringEnv("HERALD_CHANNEL_ID"),
  heraldAdminIds: optionalStringListEnv("HERALD_ADMIN_IDS"),
  heraldPublishIntervalMs: Math.max(1000, Math.floor(configuredHeraldPublishIntervalMs)),
};
