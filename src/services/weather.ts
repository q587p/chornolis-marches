import type { PrismaDb } from "../db";
import type { WorldTimeSnapshot } from "../data/worldClock";

export type WeatherKey = "clear" | "cloudy" | "mist" | "rain" | "storm";

export type WeatherProfile = {
  key: WeatherKey;
  label: string;
  shortLabel: string;
  mood: string;
  lightModifier: number;
  minIntensity: number;
  maxIntensity: number;
  minDurationMinutes: number;
  maxDurationMinutes: number;
  weight: number;
};

export const WEATHER_PROFILES: Record<WeatherKey, WeatherProfile> = {
  clear: {
    key: "clear",
    label: "ясно",
    shortLabel: "ясно",
    mood: "Небо тримається рівно; світлу легше знаходити стежки.",
    lightModifier: 8,
    minIntensity: 10,
    maxIntensity: 35,
    minDurationMinutes: 180,
    maxDurationMinutes: 420,
    weight: 20,
  },
  cloudy: {
    key: "cloudy",
    label: "хмарно",
    shortLabel: "хмари",
    mood: "Хмари лежать над верхів'ям, але світ ще не стихає остаточно.",
    lightModifier: -8,
    minIntensity: 25,
    maxIntensity: 60,
    minDurationMinutes: 160,
    maxDurationMinutes: 360,
    weight: 32,
  },
  mist: {
    key: "mist",
    label: "туман",
    shortLabel: "туман",
    mood: "Туман присідає нижче між стежками й краде далекі обриси.",
    lightModifier: -14,
    minIntensity: 30,
    maxIntensity: 70,
    minDurationMinutes: 90,
    maxDurationMinutes: 240,
    weight: 22,
  },
  rain: {
    key: "rain",
    label: "дощ",
    shortLabel: "дощ",
    mood: "Дощ притишує землю й робить повітря важчим.",
    lightModifier: -20,
    minIntensity: 35,
    maxIntensity: 80,
    minDurationMinutes: 80,
    maxDurationMinutes: 220,
    weight: 18,
  },
  storm: {
    key: "storm",
    label: "злива",
    shortLabel: "злива",
    mood: "Злива змикає ліс ближче до плечей; світло мусить пробиватися.",
    lightModifier: -32,
    minIntensity: 65,
    maxIntensity: 100,
    minDurationMinutes: 30,
    maxDurationMinutes: 120,
    weight: 8,
  },
};

export const INITIAL_WEATHER_KEY: WeatherKey = "cloudy";
export const INITIAL_WEATHER_INTENSITY = 35;

const WEATHER_KEYS = Object.keys(WEATHER_PROFILES) as WeatherKey[];

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function randomBetween(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

export function normalizeWeatherKey(key: string | null | undefined): WeatherKey {
  return WEATHER_KEYS.includes(key as WeatherKey) ? key as WeatherKey : INITIAL_WEATHER_KEY;
}

export function weatherProfile(key: string | null | undefined) {
  return WEATHER_PROFILES[normalizeWeatherKey(key)];
}

export function weatherIntensityLabel(intensity: number) {
  if (intensity < 25) return "ледь помітна";
  if (intensity < 50) return "помірна";
  if (intensity < 75) return "густа";
  return "сильна";
}

export function weatherLightModifier(key: string | null | undefined, intensity: number) {
  const profile = weatherProfile(key);
  const scaled = profile.lightModifier * clamp(intensity, 0, 100) / 100;
  return Math.round(scaled);
}

export function weatherDurationMinutes(key: string | null | undefined) {
  const profile = weatherProfile(key);
  return randomBetween(profile.minDurationMinutes, profile.maxDurationMinutes);
}

export function weatherIntensityFor(key: string | null | undefined) {
  const profile = weatherProfile(key);
  return randomBetween(profile.minIntensity, profile.maxIntensity);
}

export function pickNextWeatherKey(currentKey: string | null | undefined, randomValue = Math.random()) {
  const current = normalizeWeatherKey(currentKey);
  const weighted = WEATHER_KEYS.flatMap((key) => {
    const weight = key === current ? Math.max(1, Math.floor(WEATHER_PROFILES[key].weight / 3)) : WEATHER_PROFILES[key].weight;
    return Array.from({ length: weight }, () => key);
  });
  const index = clamp(Math.floor(randomValue * weighted.length), 0, weighted.length - 1);
  return weighted[index] ?? INITIAL_WEATHER_KEY;
}

export function renderWeatherLine(snapshot: Pick<WorldTimeSnapshot, "weatherKey" | "weatherIntensity">) {
  const profile = weatherProfile(snapshot.weatherKey);
  return `${profile.label}; ${weatherIntensityLabel(snapshot.weatherIntensity)}`;
}

export function renderCurrentWeather(snapshot: Pick<WorldTimeSnapshot, "weatherKey" | "weatherIntensity">) {
  const profile = weatherProfile(snapshot.weatherKey);
  return [
    "🌦 Погода Порубіжжя",
    "",
    `Зараз: ${renderWeatherLine(snapshot)}.`,
    "",
    profile.mood,
  ].join("\n");
}

export async function advanceWeatherState(
  state: {
    id: number;
    absoluteMinute: number;
    weatherKey: string;
    weatherIntensity: number;
    weatherEndsAtMinute: number | null;
  },
  db?: PrismaDb,
) {
  const client = db ?? (await import("../db")).prisma;
  const currentKey = normalizeWeatherKey(state.weatherKey);
  if (state.weatherEndsAtMinute == null) {
    return client.worldState.update({
      where: { id: state.id },
      data: {
        weatherKey: currentKey,
        weatherIntensity: clamp(state.weatherIntensity, 0, 100),
        weatherEndsAtMinute: state.absoluteMinute + weatherDurationMinutes(currentKey),
      },
    });
  }

  if (state.absoluteMinute < state.weatherEndsAtMinute) return state;

  const nextKey = pickNextWeatherKey(currentKey);
  const nextIntensity = weatherIntensityFor(nextKey);
  const nextEndsAtMinute = state.absoluteMinute + weatherDurationMinutes(nextKey);
  const updated = await client.worldState.update({
    where: { id: state.id },
    data: {
      weatherKey: nextKey,
      weatherIntensity: nextIntensity,
      weatherEndsAtMinute: nextEndsAtMinute,
    },
  });

  await client.worldEvent.create({
    data: {
      type: "SYSTEM",
      title: "Weather changed",
      description: `weather=${nextKey}; intensity=${nextIntensity}; absoluteMinute=${state.absoluteMinute}; nextChangeAt=${nextEndsAtMinute}`,
    },
  });

  return updated;
}
