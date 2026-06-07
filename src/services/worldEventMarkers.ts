import type { Prisma } from "@prisma/client";
import { prisma } from "../db";
import { withSlowLog } from "../utils/slowLog";

export type WorldEventMarkerScopeType =
  | "PLAYER"
  | "CREATURE"
  | "LOCATION"
  | "GLOBAL"
  | "PLAYER_TARGET"
  | "PLAYER_MENTOR";

type WorldEventMarkerDb = {
  worldEventMarker?: {
    create: (...args: any[]) => Promise<any>;
    findFirst: (...args: any[]) => Promise<any>;
    deleteMany?: (...args: any[]) => Promise<any>;
  };
};

export type WorldEventMarkerLookupInput = {
  markerKey: string;
  scopeType?: WorldEventMarkerScopeType;
  playerId?: number | null;
  creatureId?: number | null;
  locationId?: number | null;
  targetType?: string | null;
  targetId?: number | null;
  sourceEventId?: number | null;
  worldEventId?: number | null;
  contextKey?: string | null;
  cooldownMs?: number;
  now?: Date;
};

export type WorldEventMarkerCreateInput = WorldEventMarkerLookupInput & {
  metadata?: unknown;
  expiresAt?: Date | null;
  ttlMs?: number;
};

const PRIVATE_METADATA_KEY = /(?:message|body|description|telegram|chat|token|secret|private|whisper|reply)/iu;

function definedData(input: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
}

function sanitizeMetadataValue(value: unknown, key = ""): any {
  if (key && PRIVATE_METADATA_KEY.test(key)) return undefined;
  if (value === null) return undefined;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value === "string") return value.length <= 128 ? value : undefined;
  if (Array.isArray(value)) {
    const items = value
      .map((item) => sanitizeMetadataValue(item))
      .filter((item): item is Prisma.InputJsonValue => item !== undefined);
    return items;
  }
  if (typeof value === "object" && value) {
    const entries = Object.entries(value)
      .map(([entryKey, entryValue]) => [entryKey, sanitizeMetadataValue(entryValue, entryKey)] as const)
      .filter(([, entryValue]) => entryValue !== undefined);
    if (!entries.length) return undefined;
    return Object.fromEntries(entries) as Prisma.InputJsonObject;
  }
  return undefined;
}

export function worldEventMarkerMetadata(metadata: unknown): Prisma.InputJsonValue | undefined {
  return sanitizeMetadataValue(metadata);
}

export function markerScopeType(input: WorldEventMarkerLookupInput): WorldEventMarkerScopeType {
  if (input.scopeType) return input.scopeType;
  if (input.playerId && input.creatureId) return "PLAYER_MENTOR";
  if (input.playerId && input.targetType && input.targetId) return "PLAYER_TARGET";
  if (input.playerId) return "PLAYER";
  if (input.creatureId) return "CREATURE";
  if (input.locationId) return "LOCATION";
  return "GLOBAL";
}

export function markerScopeDescription(input: WorldEventMarkerLookupInput) {
  return [
    `key=${input.markerKey}`,
    `scope=${markerScopeType(input)}`,
    input.playerId ? `player=${input.playerId}` : null,
    input.creatureId ? `creature=${input.creatureId}` : null,
    input.locationId ? `location=${input.locationId}` : null,
    input.targetType && input.targetId ? `target=${input.targetType}:${input.targetId}` : null,
    input.contextKey ? `context=${input.contextKey}` : null,
    input.sourceEventId ? `source=${input.sourceEventId}` : null,
  ].filter(Boolean).join("; ");
}

function markerWhere(input: WorldEventMarkerLookupInput) {
  const now = input.now ?? new Date();
  const where: Record<string, unknown> = definedData({
    markerKey: input.markerKey,
    playerId: input.playerId ?? undefined,
    creatureId: input.creatureId ?? undefined,
    locationId: input.locationId ?? undefined,
    targetType: input.targetType ?? undefined,
    targetId: input.targetId ?? undefined,
    sourceEventId: input.sourceEventId ?? undefined,
    worldEventId: input.worldEventId ?? undefined,
    contextKey: input.contextKey ?? undefined,
  });
  if ((input.cooldownMs ?? 0) > 0) {
    where.createdAt = { gte: new Date(now.getTime() - Math.max(0, input.cooldownMs ?? 0)) };
  }
  where.OR = [{ expiresAt: null }, { expiresAt: { gt: now } }];
  return where;
}

function markerCreateData(input: WorldEventMarkerCreateInput) {
  const now = input.now ?? new Date();
  const metadata = worldEventMarkerMetadata(input.metadata);
  return definedData({
    markerKey: input.markerKey,
    scopeType: markerScopeType(input),
    playerId: input.playerId ?? undefined,
    creatureId: input.creatureId ?? undefined,
    locationId: input.locationId ?? undefined,
    targetType: input.targetType ?? undefined,
    targetId: input.targetId ?? undefined,
    sourceEventId: input.sourceEventId ?? undefined,
    worldEventId: input.worldEventId ?? undefined,
    contextKey: input.contextKey ?? undefined,
    metadata,
    expiresAt: input.expiresAt ?? ((input.ttlMs ?? 0) > 0 ? new Date(now.getTime() + Math.max(0, input.ttlMs ?? 0)) : undefined),
    ...(input.now ? { createdAt: input.now } : {}),
  });
}

export async function createWorldEventMarker(input: WorldEventMarkerCreateInput, db: WorldEventMarkerDb = prisma as any) {
  if (!db.worldEventMarker) throw new Error("WorldEventMarker model is not available");
  return db.worldEventMarker.create({ data: markerCreateData(input) });
}

export async function findRecentWorldEventMarker(input: WorldEventMarkerLookupInput, db: WorldEventMarkerDb = prisma as any) {
  if (!db.worldEventMarker || (input.cooldownMs ?? 0) <= 0) return null;
  return withSlowLog("worldEventMarker.lookup", () => db.worldEventMarker!.findFirst({
    where: markerWhere(input),
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  }));
}

export async function hasRecentWorldEventMarker(input: WorldEventMarkerLookupInput, db: WorldEventMarkerDb = prisma as any) {
  return Boolean(await findRecentWorldEventMarker(input, db));
}

export async function recordWorldEventMarkerIfAbsent(input: WorldEventMarkerCreateInput, db: WorldEventMarkerDb = prisma as any) {
  const existing = await findRecentWorldEventMarker(input, db);
  if (existing) return { created: false as const, marker: existing };
  const marker = await createWorldEventMarker(input, db);
  return { created: true as const, marker };
}

export async function deleteExpiredWorldEventMarkers(now = new Date(), db: WorldEventMarkerDb = prisma as any) {
  if (!db.worldEventMarker?.deleteMany) return { count: 0 };
  return db.worldEventMarker.deleteMany({
    where: { expiresAt: { lt: now } },
  });
}
