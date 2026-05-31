import { prisma, type PrismaDb } from "../db";
import {
  START_WORLD_ABSOLUTE_MINUTE,
  advanceWorldClockFields,
  worldTimeSnapshotFromAbsoluteMinute,
  type WorldTimeSnapshot,
} from "../data/worldClock";

const WORLD_STATE_ID = 1;
export const INITIAL_WEATHER_KEY = "cloudy";
export const INITIAL_WEATHER_INTENSITY = 35;

export async function ensureWorldState(db: PrismaDb = prisma, now = new Date()) {
  return db.worldState.upsert({
    where: { id: WORLD_STATE_ID },
    update: {},
    create: {
      id: WORLD_STATE_ID,
      absoluteMinute: START_WORLD_ABSOLUTE_MINUTE,
      lastAdvancedAt: now,
      weatherKey: INITIAL_WEATHER_KEY,
      weatherIntensity: INITIAL_WEATHER_INTENSITY,
    },
  });
}

export async function resetWorldClockState(db: PrismaDb = prisma, now = new Date()) {
  return db.worldState.upsert({
    where: { id: WORLD_STATE_ID },
    update: {
      absoluteMinute: START_WORLD_ABSOLUTE_MINUTE,
      lastAdvancedAt: now,
      weatherKey: INITIAL_WEATHER_KEY,
      weatherIntensity: INITIAL_WEATHER_INTENSITY,
      weatherEndsAtMinute: null,
    },
    create: {
      id: WORLD_STATE_ID,
      absoluteMinute: START_WORLD_ABSOLUTE_MINUTE,
      lastAdvancedAt: now,
      weatherKey: INITIAL_WEATHER_KEY,
      weatherIntensity: INITIAL_WEATHER_INTENSITY,
      weatherEndsAtMinute: null,
    },
  });
}

export async function advanceWorldClock(db: PrismaDb = prisma, now = new Date()) {
  const state = await ensureWorldState(db, now);
  const advanced = advanceWorldClockFields(state, now);

  if (advanced.advancedMinutes <= 0) {
    return { state, advancedMinutes: 0 };
  }

  const updated = await db.worldState.update({
    where: { id: WORLD_STATE_ID },
    data: {
      absoluteMinute: advanced.absoluteMinute,
      lastAdvancedAt: advanced.lastAdvancedAt,
    },
  });

  return { state: updated, advancedMinutes: advanced.advancedMinutes };
}

export async function getCurrentWorldTimeSnapshot(db: PrismaDb = prisma, now = new Date()): Promise<WorldTimeSnapshot> {
  const { state } = await advanceWorldClock(db, now);
  return worldTimeSnapshotFromAbsoluteMinute(state.absoluteMinute, state.weatherKey, state.weatherIntensity);
}
