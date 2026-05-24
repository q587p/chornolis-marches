import { WeatherType } from "@prisma/client";
import { prisma } from "../db";
import { CURRENT_WORLD_YEAR, formatWorldYear } from "./calendar";

export const REAL_MS_PER_GAME_HOUR = Math.max(10_000, Math.floor(Number(process.env.WORLD_REAL_MS_PER_GAME_HOUR || 120_000)));
const REAL_MS_PER_GAME_MINUTE = REAL_MS_PER_GAME_HOUR / 60;
const START_ABSOLUTE_MINUTE = 6 * 60;
const WORLD_STATE_ID = 1;

const HOURS_PER_DAY = 24;
const MINUTES_PER_DAY = HOURS_PER_DAY * 60;
const DAYS_PER_LUNAR_CIRCLE = 28;
const LUNAR_CIRCLES_PER_YEAR = 13;
const DAYS_PER_YEAR = DAYS_PER_LUNAR_CIRCLE * LUNAR_CIRCLES_PER_YEAR;
const MINUTES_PER_YEAR = DAYS_PER_YEAR * MINUTES_PER_DAY;

export type SeasonName = "winter" | "spring" | "summer" | "autumn";
export type DaySegment = "DAWN" | "DAY" | "DUSK" | "NIGHT";

export type MoonPhaseKey =
  | "NEW"
  | "WAXING_CRESCENT"
  | "FIRST_QUARTER"
  | "WAXING_GIBBOUS"
  | "FULL"
  | "WANING_GIBBOUS"
  | "LAST_QUARTER"
  | "WANING_CRESCENT"
  | "DARK";

export type WorldTimeSnapshot = {
  absoluteMinute: number;
  year: number;
  lunarCircle: number;
  lunarCircleName: string;
  dayOfCircle: number;
  dayOfYear: number;
  hour: number;
  minute: number;
  daySegment: DaySegment;
  daySegmentLabel: string;
  season: SeasonName;
  seasonLabel: string;
  moonAge: number;
  moonPhase: MoonPhaseKey;
  moonPhaseLabel: string;
  moonIllumination: number;
  weather: WeatherType;
  weatherLabel: string;
  weatherIntensity: number;
  weatherEndsAtMinute: number;
};

export type LightSnapshot = {
  level: number;
  label: string;
  naturalLevel: number;
  weatherPenalty: number;
  featureBonus: number;
};

const LUNAR_CIRCLE_NAMES = [
  "Коло Паморозі",
  "Коло Вовчого Сліду",
  "Коло Проталин",
  "Коло Соку",
  "Коло Зеленого Шуму",
  "Коло Купальського Жару",
  "Коло Липового Меду",
  "Коло Серпа",
  "Коло Вересу",
  "Коло Жовтого Листу",
  "Коло Чорної Стежки",
  "Коло Груддя",
  "Коло Довгої Ночі",
];

const WEATHER_LABELS: Record<WeatherType, string> = {
  [WeatherType.CLEAR]: "ясно",
  [WeatherType.CLOUDY]: "хмарно",
  [WeatherType.FOG]: "туман",
  [WeatherType.DRIZZLE]: "мряка",
  [WeatherType.RAIN]: "дощ",
  [WeatherType.STORM]: "буря",
  [WeatherType.SNOW]: "сніг",
};

const DAY_SEGMENT_LABELS: Record<DaySegment, string> = {
  DAWN: "світанок",
  DAY: "день",
  DUSK: "сутінки",
  NIGHT: "ніч",
};

const SEASON_LABELS: Record<SeasonName, string> = {
  winter: "зима",
  spring: "весна",
  summer: "літо",
  autumn: "осінь",
};

const MOON_PHASE_LABELS: Record<MoonPhaseKey, string> = {
  NEW: "молодик",
  WAXING_CRESCENT: "молодий серп",
  FIRST_QUARTER: "перша чверть",
  WAXING_GIBBOUS: "прибуває",
  FULL: "повня",
  WANING_GIBBOUS: "спадає",
  LAST_QUARTER: "остання чверть",
  WANING_CRESCENT: "старий серп",
  DARK: "темний місяць",
};

const WEATHER_WEIGHTS: Record<SeasonName, Array<[WeatherType, number]>> = {
  winter: [
    [WeatherType.CLEAR, 12],
    [WeatherType.CLOUDY, 28],
    [WeatherType.FOG, 12],
    [WeatherType.DRIZZLE, 4],
    [WeatherType.RAIN, 4],
    [WeatherType.STORM, 2],
    [WeatherType.SNOW, 38],
  ],
  spring: [
    [WeatherType.CLEAR, 20],
    [WeatherType.CLOUDY, 26],
    [WeatherType.FOG, 14],
    [WeatherType.DRIZZLE, 16],
    [WeatherType.RAIN, 18],
    [WeatherType.STORM, 6],
    [WeatherType.SNOW, 0],
  ],
  summer: [
    [WeatherType.CLEAR, 38],
    [WeatherType.CLOUDY, 18],
    [WeatherType.FOG, 8],
    [WeatherType.DRIZZLE, 8],
    [WeatherType.RAIN, 16],
    [WeatherType.STORM, 12],
    [WeatherType.SNOW, 0],
  ],
  autumn: [
    [WeatherType.CLEAR, 14],
    [WeatherType.CLOUDY, 30],
    [WeatherType.FOG, 20],
    [WeatherType.DRIZZLE, 18],
    [WeatherType.RAIN, 14],
    [WeatherType.STORM, 4],
    [WeatherType.SNOW, 0],
  ],
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function mod(value: number, divisor: number) {
  return ((value % divisor) + divisor) % divisor;
}

function randomInt(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function pickWeighted<T>(items: Array<[T, number]>): T {
  const filtered = items.filter(([, weight]) => weight > 0);
  const total = filtered.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = Math.random() * total;
  for (const [item, weight] of filtered) {
    roll -= weight;
    if (roll <= 0) return item;
  }
  return filtered[filtered.length - 1][0];
}

function seasonForCircle(lunarCircle: number): SeasonName {
  if (lunarCircle === 1 || lunarCircle === 2 || lunarCircle === 13) return "winter";
  if (lunarCircle >= 3 && lunarCircle <= 5) return "spring";
  if (lunarCircle >= 6 && lunarCircle <= 8) return "summer";
  return "autumn";
}

function daySegmentForHour(hour: number): DaySegment {
  if (hour >= 5 && hour < 7) return "DAWN";
  if (hour >= 7 && hour < 18) return "DAY";
  if (hour >= 18 && hour < 20) return "DUSK";
  return "NIGHT";
}

function moonPhaseForAge(age: number): MoonPhaseKey {
  if (age < 1.5) return "NEW";
  if (age < 6.5) return "WAXING_CRESCENT";
  if (age < 8.5) return "FIRST_QUARTER";
  if (age < 13.5) return "WAXING_GIBBOUS";
  if (age < 15.5) return "FULL";
  if (age < 20.5) return "WANING_GIBBOUS";
  if (age < 22.5) return "LAST_QUARTER";
  if (age < 27) return "WANING_CRESCENT";
  return "DARK";
}

function moonIlluminationForAge(age: number) {
  const radians = (age / DAYS_PER_LUNAR_CIRCLE) * Math.PI * 2;
  return clamp(Math.round((1 - Math.cos(radians)) * 50), 0, 100);
}

function intensityFor(weather: WeatherType) {
  if (weather === WeatherType.CLEAR) return randomInt(0, 20);
  if (weather === WeatherType.CLOUDY) return randomInt(25, 65);
  if (weather === WeatherType.FOG) return randomInt(35, 85);
  if (weather === WeatherType.DRIZZLE) return randomInt(25, 55);
  if (weather === WeatherType.RAIN) return randomInt(45, 80);
  if (weather === WeatherType.STORM) return randomInt(75, 100);
  if (weather === WeatherType.SNOW) return randomInt(35, 85);
  return randomInt(20, 60);
}

function durationHoursFor(weather: WeatherType) {
  if (weather === WeatherType.STORM) return randomInt(1, 3);
  if (weather === WeatherType.FOG || weather === WeatherType.DRIZZLE) return randomInt(2, 6);
  if (weather === WeatherType.RAIN) return randomInt(2, 8);
  if (weather === WeatherType.SNOW) return randomInt(3, 10);
  return randomInt(3, 9);
}

function weatherLightPenalty(weather: WeatherType, intensity: number) {
  if (weather === WeatherType.CLEAR) return 0;
  if (weather === WeatherType.CLOUDY) return Math.round(intensity * 0.18);
  if (weather === WeatherType.FOG) return Math.round(intensity * 0.4);
  if (weather === WeatherType.DRIZZLE) return Math.round(intensity * 0.22);
  if (weather === WeatherType.RAIN) return Math.round(intensity * 0.34);
  if (weather === WeatherType.STORM) return Math.round(intensity * 0.55);
  if (weather === WeatherType.SNOW) return Math.round(intensity * 0.18);
  return Math.round(intensity * 0.2);
}

function generateWeather(absoluteMinute: number) {
  const snapshot = buildSnapshot({
    absoluteMinute,
    weather: WeatherType.CLOUDY,
    weatherIntensity: 30,
    weatherEndsAtMinute: absoluteMinute,
  });
  const weather = pickWeighted(WEATHER_WEIGHTS[snapshot.season]);
  return {
    weather,
    weatherIntensity: intensityFor(weather),
    weatherEndsAtMinute: absoluteMinute + durationHoursFor(weather) * 60,
  };
}

async function getOrCreateWorldState(now = new Date()) {
  return prisma.worldState.upsert({
    where: { id: WORLD_STATE_ID },
    update: {},
    create: {
      id: WORLD_STATE_ID,
      absoluteMinute: START_ABSOLUTE_MINUTE,
      lastAdvancedAt: now,
      weather: WeatherType.CLOUDY,
      weatherIntensity: 35,
      weatherEndsAtMinute: START_ABSOLUTE_MINUTE + 6 * 60,
    },
  });
}

export function buildSnapshot(state: {
  absoluteMinute: number;
  weather: WeatherType;
  weatherIntensity: number;
  weatherEndsAtMinute: number;
}): WorldTimeSnapshot {
  const absoluteMinute = Math.max(0, state.absoluteMinute);
  const minuteOfDay = mod(absoluteMinute, MINUTES_PER_DAY);
  const dayIndex = Math.floor(absoluteMinute / MINUTES_PER_DAY);
  const yearOffset = Math.floor(absoluteMinute / MINUTES_PER_YEAR);
  const dayOfYearIndex = mod(dayIndex, DAYS_PER_YEAR);
  const lunarCircleIndex = Math.floor(dayOfYearIndex / DAYS_PER_LUNAR_CIRCLE);
  const lunarCircle = lunarCircleIndex + 1;
  const dayOfCircle = (dayOfYearIndex % DAYS_PER_LUNAR_CIRCLE) + 1;
  const hour = Math.floor(minuteOfDay / 60);
  const minute = minuteOfDay % 60;
  const moonAge = (dayOfCircle - 1 + hour / 24 + minute / 1440) % DAYS_PER_LUNAR_CIRCLE;
  const daySegment = daySegmentForHour(hour);
  const season = seasonForCircle(lunarCircle);
  const moonPhase = moonPhaseForAge(moonAge);

  return {
    absoluteMinute,
    year: CURRENT_WORLD_YEAR + yearOffset,
    lunarCircle,
    lunarCircleName: LUNAR_CIRCLE_NAMES[lunarCircleIndex] ?? `Коло ${lunarCircle}`,
    dayOfCircle,
    dayOfYear: dayOfYearIndex + 1,
    hour,
    minute,
    daySegment,
    daySegmentLabel: DAY_SEGMENT_LABELS[daySegment],
    season,
    seasonLabel: SEASON_LABELS[season],
    moonAge,
    moonPhase,
    moonPhaseLabel: MOON_PHASE_LABELS[moonPhase],
    moonIllumination: moonIlluminationForAge(moonAge),
    weather: state.weather,
    weatherLabel: WEATHER_LABELS[state.weather],
    weatherIntensity: clamp(state.weatherIntensity, 0, 100),
    weatherEndsAtMinute: state.weatherEndsAtMinute,
  };
}

export async function advanceWorldTime(now = new Date()) {
  const state = await getOrCreateWorldState(now);
  const elapsedMs = Math.max(0, now.getTime() - state.lastAdvancedAt.getTime());
  const advancedByMinutes = Math.floor(elapsedMs / REAL_MS_PER_GAME_MINUTE);

  if (advancedByMinutes <= 0) {
    return {
      snapshot: buildSnapshot(state),
      advancedByMinutes: 0,
      weatherChanged: false,
    };
  }

  const absoluteMinute = state.absoluteMinute + advancedByMinutes;
  const lastAdvancedAt = new Date(state.lastAdvancedAt.getTime() + Math.floor(advancedByMinutes * REAL_MS_PER_GAME_MINUTE));
  const nextWeather = absoluteMinute >= state.weatherEndsAtMinute ? generateWeather(absoluteMinute) : null;
  const weatherChanged = Boolean(nextWeather && nextWeather.weather !== state.weather);

  const updated = await prisma.worldState.update({
    where: { id: WORLD_STATE_ID },
    data: {
      absoluteMinute,
      lastAdvancedAt,
      ...(nextWeather ?? {}),
    },
  });

  if (weatherChanged && nextWeather) {
    await prisma.worldEvent.create({
      data: {
        type: "SYSTEM",
        title: "Погода змінилася",
        description: `Над Порубіжжям тепер ${WEATHER_LABELS[nextWeather.weather]}; сила явища ${nextWeather.weatherIntensity}/100.`,
      },
    });
  }

  return {
    snapshot: buildSnapshot(updated),
    advancedByMinutes,
    weatherChanged,
  };
}

export async function getWorldTimeSnapshot(options: { advance?: boolean } = {}) {
  if (options.advance) return (await advanceWorldTime()).snapshot;
  return buildSnapshot(await getOrCreateWorldState());
}

export function formatClock(snapshot: WorldTimeSnapshot) {
  return `${String(snapshot.hour).padStart(2, "0")}:${String(snapshot.minute).padStart(2, "0")}`;
}

export function formatWorldDate(snapshot: WorldTimeSnapshot) {
  return `${snapshot.dayOfCircle}-й день, ${snapshot.lunarCircleName}`;
}

export function formatWorldTimeSnapshotShort(snapshot: WorldTimeSnapshot) {
  return `${formatClock(snapshot)}, ${formatWorldDate(snapshot)}, ${snapshot.year} літо`;
}

function naturalLightLevel(snapshot: WorldTimeSnapshot) {
  if (snapshot.daySegment === "DAY") return 90;
  if (snapshot.daySegment === "DAWN" || snapshot.daySegment === "DUSK") return 42;
  return Math.round(6 + snapshot.moonIllumination * 0.42);
}

function lightLabel(level: number) {
  if (level >= 80) return "світло";
  if (level >= 55) return "досить видно";
  if (level >= 35) return "сутінково";
  if (level >= 20) return "темно";
  if (level >= 8) return "дуже темно";
  return "майже непроглядна темрява";
}

export function getLocationLight(snapshot: WorldTimeSnapshot, features: Array<{ isActive?: boolean; providesLight?: boolean }> = []): LightSnapshot {
  const naturalLevel = naturalLightLevel(snapshot);
  const weatherPenalty = weatherLightPenalty(snapshot.weather, snapshot.weatherIntensity);
  const featureBonus = features.some((feature) => feature.isActive !== false && feature.providesLight) ? 35 : 0;
  const level = clamp(Math.round(naturalLevel - weatherPenalty + featureBonus), 0, 100);

  return {
    level,
    label: lightLabel(level),
    naturalLevel,
    weatherPenalty,
    featureBonus,
  };
}

function formatRealDuration(ms: number) {
  if (ms < 60_000) return `${Math.round(ms / 1000)} с`;
  return `${Math.round(ms / 60_000)} хв`;
}

export async function renderAmbientLocationLine(features: Array<{ isActive?: boolean; providesLight?: boolean }> = []) {
  const snapshot = await getWorldTimeSnapshot({ advance: true });
  const light = getLocationLight(snapshot, features);
  return `🕯 ${formatClock(snapshot)}; ${snapshot.daySegmentLabel}; погода: ${snapshot.weatherLabel} ${snapshot.weatherIntensity}/100; місяць: ${snapshot.moonPhaseLabel} ${snapshot.moonIllumination}/100; видимість: ${light.label} (${light.level}/100).`;
}

export async function renderWorldTimeStatus() {
  const snapshot = await getWorldTimeSnapshot({ advance: true });
  const light = getLocationLight(snapshot);
  const minutesUntilWeatherChange = Math.max(0, snapshot.weatherEndsAtMinute - snapshot.absoluteMinute);
  const hoursUntilWeatherChange = Math.max(1, Math.ceil(minutesUntilWeatherChange / 60));

  return [
    "🕯 Час і небо Порубіжжя",
    "",
    `Зараз: ${formatWorldTimeSnapshotShort(snapshot)}`,
    `Рік: ${formatWorldYear(snapshot.year)}`,
    `Пора: ${snapshot.daySegmentLabel}; сезон: ${snapshot.seasonLabel}`,
    `Місяць: ${snapshot.moonPhaseLabel}, світло ${snapshot.moonIllumination}/100`,
    `Погода: ${snapshot.weatherLabel}, сила ${snapshot.weatherIntensity}/100`,
    `Природне світло: ${light.label} (${light.level}/100)`,
    `Орієнтовна зміна погоди: за ${hoursUntilWeatherChange} ігров. год.`,
    "",
    `Темп: 1 ігрова година = ${formatRealDuration(REAL_MS_PER_GAME_HOUR)} реального часу.`,
  ].join("\n");
}
