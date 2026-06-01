import { prisma, type PrismaDb } from "../db";
import {
  START_WORLD_ABSOLUTE_MINUTE,
  advanceWorldClockFields,
  worldTimeSnapshotFromAbsoluteMinute,
  type WorldTimeSnapshot,
} from "../data/worldClock";
import {
  advanceWeatherState,
  clampWeatherIntensity,
  INITIAL_WEATHER_INTENSITY,
  INITIAL_WEATHER_KEY,
  normalizeWeatherKey,
  weatherDurationMinutes,
} from "./weather";

const WORLD_STATE_ID = 1;

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
    return { state: await advanceWeatherState(state, db), advancedMinutes: 0 };
  }

  const updated = await db.worldState.update({
    where: { id: WORLD_STATE_ID },
    data: {
      absoluteMinute: advanced.absoluteMinute,
      lastAdvancedAt: advanced.lastAdvancedAt,
    },
  });

  return { state: await advanceWeatherState(updated, db), advancedMinutes: advanced.advancedMinutes };
}

export async function getCurrentWorldState(db: PrismaDb = prisma, now = new Date()) {
  const { state } = await advanceWorldClock(db, now);
  return state;
}

export async function getCurrentWorldTimeSnapshot(db: PrismaDb = prisma, now = new Date()): Promise<WorldTimeSnapshot> {
  const { state } = await advanceWorldClock(db, now);
  return worldTimeSnapshotFromAbsoluteMinute(state.absoluteMinute, state.weatherKey, state.weatherIntensity);
}

export async function setWorldClockAbsoluteMinute(
  absoluteMinute: number,
  db: PrismaDb = prisma,
  now = new Date(),
) {
  await ensureWorldState(db, now);
  return db.worldState.update({
    where: { id: WORLD_STATE_ID },
    data: {
      absoluteMinute: Math.max(0, Math.floor(absoluteMinute)),
      lastAdvancedAt: now,
    },
  });
}

export async function setWorldWeatherState(
  weatherKey: string,
  options: { intensity?: number; durationMinutes?: number } = {},
  db: PrismaDb = prisma,
  now = new Date(),
) {
  const state = await ensureWorldState(db, now);
  const key = normalizeWeatherKey(weatherKey);
  const intensity = clampWeatherIntensity(options.intensity ?? INITIAL_WEATHER_INTENSITY);
  const durationMinutes = Math.max(1, Math.floor(options.durationMinutes ?? weatherDurationMinutes(key)));

  return db.worldState.update({
    where: { id: WORLD_STATE_ID },
    data: {
      weatherKey: key,
      weatherIntensity: intensity,
      weatherEndsAtMinute: state.absoluteMinute + durationMinutes,
    },
  });
}
