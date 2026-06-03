const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};

export const REAL_MS_PER_GAME_HOUR = Math.max(10_000, Math.floor(Number(env.WORLD_REAL_MS_PER_GAME_HOUR || 120_000)));
export const REAL_MS_PER_GAME_MINUTE = Math.max(1, Math.floor(REAL_MS_PER_GAME_HOUR / 60));

export const HOURS_PER_WORLD_DAY = 24;
export const MINUTES_PER_WORLD_DAY = HOURS_PER_WORLD_DAY * 60;
export const DAYS_PER_LUNAR_CIRCLE = 28;
export const LUNAR_CIRCLES_PER_YEAR = 13;
export const DAYS_PER_WORLD_YEAR = DAYS_PER_LUNAR_CIRCLE * LUNAR_CIRCLES_PER_YEAR;
export const MINUTES_PER_WORLD_YEAR = DAYS_PER_WORLD_YEAR * MINUTES_PER_WORLD_DAY;

function worldHourWord(value: number) {
  const normalized = Math.abs(Math.floor(value));
  const lastTwo = normalized % 100;
  if (lastTwo >= 11 && lastTwo <= 14) return "годин";
  const last = normalized % 10;
  if (last === 1) return "годину";
  if (last >= 2 && last <= 4) return "години";
  return "годин";
}

export function approximateWorldDurationFromRealMs(ms: number) {
  const safeMs = Math.max(0, Math.floor(ms));
  const hours = Math.ceil(safeMs / REAL_MS_PER_GAME_HOUR);
  if (hours <= 0) return "менш ніж годину";
  return `приблизно ${hours} ${worldHourWord(hours)}`;
}

export const WORLD_START_YEAR = 587;
export const WORLD_START_LUNAR_CIRCLE = 5;
export const WORLD_START_DAY_OF_CIRCLE = 17;
export const WORLD_START_HOUR = 17;
export const WORLD_START_MINUTE = 0;

export const START_WORLD_ABSOLUTE_MINUTE =
  (((WORLD_START_LUNAR_CIRCLE - 1) * DAYS_PER_LUNAR_CIRCLE + (WORLD_START_DAY_OF_CIRCLE - 1)) *
    MINUTES_PER_WORLD_DAY) +
  WORLD_START_HOUR * 60 +
  WORLD_START_MINUTE;

export type WorldDaypart = "dawn" | "day" | "dusk" | "night";

export type MoonPhaseKey =
  | "dark"
  | "waxing_crescent"
  | "first_quarter"
  | "waxing_gibbous"
  | "full"
  | "waning_gibbous"
  | "last_quarter"
  | "waning_crescent";

export type WorldTimeSnapshot = {
  absoluteMinute: number;
  year: number;
  lunarCircle: number;
  lunarCircleName: string;
  dayOfCircle: number;
  dayOfYear: number;
  hour: number;
  minute: number;
  daypart: WorldDaypart;
  daypartLabel: string;
  clockLabel: string;
  moonPhase: MoonPhaseKey;
  moonPhaseLabel: string;
  moonIllumination: number;
  weatherKey: string;
  weatherIntensity: number;
};

export const LUNAR_CIRCLE_NAMES = [
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
] as const;

const DAYPART_LABELS: Record<WorldDaypart, string> = {
  dawn: "світанок",
  day: "день",
  dusk: "присмерк",
  night: "ніч",
};

const MOON_PHASE_LABELS: Record<MoonPhaseKey, string> = {
  dark: "темний місяць",
  waxing_crescent: "молодик прибуває",
  first_quarter: "перша чверть",
  waxing_gibbous: "місяць наливається",
  full: "повня",
  waning_gibbous: "місяць спадає",
  last_quarter: "остання чверть",
  waning_crescent: "старий місяць",
};

export function worldDaypartForHour(hour: number): WorldDaypart {
  const normalized = ((Math.floor(hour) % 24) + 24) % 24;
  if (normalized >= 5 && normalized < 8) return "dawn";
  if (normalized >= 8 && normalized < 18) return "day";
  if (normalized >= 18 && normalized < 21) return "dusk";
  return "night";
}

export function worldDaypartLabel(daypart: WorldDaypart) {
  return DAYPART_LABELS[daypart];
}

export function moonPhaseForDay(dayOfCircle: number): MoonPhaseKey {
  const day = ((Math.floor(dayOfCircle) - 1) % DAYS_PER_LUNAR_CIRCLE + DAYS_PER_LUNAR_CIRCLE) % DAYS_PER_LUNAR_CIRCLE + 1;
  if (day === 1 || day === 28) return "dark";
  if (day <= 6) return "waxing_crescent";
  if (day <= 8) return "first_quarter";
  if (day <= 13) return "waxing_gibbous";
  if (day <= 16) return "full";
  if (day <= 21) return "waning_gibbous";
  if (day <= 23) return "last_quarter";
  return "waning_crescent";
}

export function moonPhaseLabel(phase: MoonPhaseKey) {
  return MOON_PHASE_LABELS[phase];
}

export function moonIlluminationForDay(dayOfCircle: number) {
  const age = ((Math.floor(dayOfCircle) - 1) % DAYS_PER_LUNAR_CIRCLE + DAYS_PER_LUNAR_CIRCLE) % DAYS_PER_LUNAR_CIRCLE;
  const radians = (age / DAYS_PER_LUNAR_CIRCLE) * Math.PI * 2;
  return Math.max(0, Math.min(100, Math.round((1 - Math.cos(radians)) * 50)));
}

export function worldClockLabel(hour: number, minute: number) {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function worldTimeSnapshotFromAbsoluteMinute(
  absoluteMinute: number,
  weatherKey = "cloudy",
  weatherIntensity = 35
): WorldTimeSnapshot {
  const normalizedMinute = Math.max(0, Math.floor(absoluteMinute));
  const dayIndex = Math.floor(normalizedMinute / MINUTES_PER_WORLD_DAY);
  const minuteOfDay = normalizedMinute % MINUTES_PER_WORLD_DAY;
  const yearOffset = Math.floor(dayIndex / DAYS_PER_WORLD_YEAR);
  const dayOfYearZero = dayIndex % DAYS_PER_WORLD_YEAR;
  const lunarCircle = Math.floor(dayOfYearZero / DAYS_PER_LUNAR_CIRCLE) + 1;
  const dayOfCircle = (dayOfYearZero % DAYS_PER_LUNAR_CIRCLE) + 1;
  const hour = Math.floor(minuteOfDay / 60);
  const minute = minuteOfDay % 60;
  const daypart = worldDaypartForHour(hour);
  const moonPhase = moonPhaseForDay(dayOfCircle);

  return {
    absoluteMinute: normalizedMinute,
    year: WORLD_START_YEAR + yearOffset,
    lunarCircle,
    lunarCircleName: LUNAR_CIRCLE_NAMES[lunarCircle - 1] ?? `Коло ${lunarCircle}`,
    dayOfCircle,
    dayOfYear: dayOfYearZero + 1,
    hour,
    minute,
    daypart,
    daypartLabel: worldDaypartLabel(daypart),
    clockLabel: worldClockLabel(hour, minute),
    moonPhase,
    moonPhaseLabel: moonPhaseLabel(moonPhase),
    moonIllumination: moonIlluminationForDay(dayOfCircle),
    weatherKey,
    weatherIntensity,
  };
}

export function advanceWorldClockFields(
  state: { absoluteMinute: number; lastAdvancedAt: Date },
  now = new Date(),
  realMsPerGameMinute = REAL_MS_PER_GAME_MINUTE
) {
  const elapsedMs = Math.max(0, now.getTime() - state.lastAdvancedAt.getTime());
  const advancedMinutes = Math.floor(elapsedMs / realMsPerGameMinute);
  if (advancedMinutes <= 0) {
    return {
      advancedMinutes: 0,
      absoluteMinute: state.absoluteMinute,
      lastAdvancedAt: state.lastAdvancedAt,
    };
  }

  return {
    advancedMinutes,
    absoluteMinute: state.absoluteMinute + advancedMinutes,
    lastAdvancedAt: new Date(state.lastAdvancedAt.getTime() + advancedMinutes * realMsPerGameMinute),
  };
}
