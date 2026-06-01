import {
  DAYS_PER_LUNAR_CIRCLE,
  MINUTES_PER_WORLD_DAY,
  worldTimeSnapshotFromAbsoluteMinute,
  type WorldTimeSnapshot,
} from "../data/worldClock";
import { type LightSnapshot } from "./lightSnapshot";
import { normalizeWeatherKey, renderWeatherLine } from "./weather";

const DAYPART_TIME: Record<string, { hour: number; minute: number; label: string }> = {
  dawn: { hour: 5, minute: 0, label: "світанок" },
  svitanok: { hour: 5, minute: 0, label: "світанок" },
  "світанок": { hour: 5, minute: 0, label: "світанок" },
  day: { hour: 12, minute: 0, label: "день" },
  "день": { hour: 12, minute: 0, label: "день" },
  dusk: { hour: 18, minute: 0, label: "присмерк" },
  prySmerk: { hour: 18, minute: 0, label: "присмерк" },
  "присмерк": { hour: 18, minute: 0, label: "присмерк" },
  evening: { hour: 18, minute: 0, label: "присмерк" },
  night: { hour: 22, minute: 0, label: "ніч" },
  "ніч": { hour: 22, minute: 0, label: "ніч" },
};

const MOON_DAY: Record<string, { dayOfCircle: number; label: string }> = {
  full: { dayOfCircle: 15, label: "повня" },
  fullmoon: { dayOfCircle: 15, label: "повня" },
  "повня": { dayOfCircle: 15, label: "повня" },
  dark: { dayOfCircle: 1, label: "темний місяць" },
  darkmoon: { dayOfCircle: 1, label: "темний місяць" },
  newmoon: { dayOfCircle: 1, label: "темний місяць" },
  "темний": { dayOfCircle: 1, label: "темний місяць" },
};

export type WorldTimeSetTarget = {
  absoluteMinute: number;
  label: string;
};

function currentDayStart(absoluteMinute: number) {
  return Math.floor(Math.max(0, absoluteMinute) / MINUTES_PER_WORLD_DAY) * MINUTES_PER_WORLD_DAY;
}

function minuteOfDay(hour: number, minute: number) {
  return Math.max(0, Math.min(MINUTES_PER_WORLD_DAY - 1, Math.floor(hour) * 60 + Math.floor(minute)));
}

function nearestDayWithCircleDay(currentAbsoluteMinute: number, targetDayOfCircle: number) {
  const currentSnapshot = worldTimeSnapshotFromAbsoluteMinute(currentAbsoluteMinute);
  const currentDayIndex = Math.floor(currentAbsoluteMinute / MINUTES_PER_WORLD_DAY);
  let delta = targetDayOfCircle - currentSnapshot.dayOfCircle;
  if (delta < 0) delta += DAYS_PER_LUNAR_CIRCLE;
  return currentDayIndex + delta;
}

export function parseWorldTimeSetTarget(rawInput: string, currentAbsoluteMinute: number): WorldTimeSetTarget | null {
  const input = rawInput.trim().toLocaleLowerCase("uk-UA");
  if (!input) return null;

  const absoluteMatch = input.match(/^abs(?:olute)?\s+(\d+)$/);
  if (absoluteMatch) {
    const absoluteMinute = Math.max(0, Math.floor(Number(absoluteMatch[1])));
    return { absoluteMinute, label: `absolute minute ${absoluteMinute}` };
  }

  const tokens = input.split(/\s+/).filter(Boolean);
  let time = tokens.map((token) => DAYPART_TIME[token]).find(Boolean);
  const clockMatch = input.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  if (clockMatch) {
    time = {
      hour: Number(clockMatch[1]),
      minute: Number(clockMatch[2]),
      label: `${clockMatch[1].padStart(2, "0")}:${clockMatch[2]}`,
    };
  }

  const moon = tokens.map((token) => MOON_DAY[token]).find(Boolean);
  if (!time && !moon) return null;

  const targetMinuteOfDay = time ? minuteOfDay(time.hour, time.minute) : worldTimeSnapshotFromAbsoluteMinute(currentAbsoluteMinute).hour * 60;
  const targetDayIndex = moon
    ? nearestDayWithCircleDay(currentAbsoluteMinute, moon.dayOfCircle)
    : Math.floor(currentAbsoluteMinute / MINUTES_PER_WORLD_DAY);
  const absoluteMinute = targetDayIndex * MINUTES_PER_WORLD_DAY + targetMinuteOfDay;
  const label = [moon?.label, time?.label].filter(Boolean).join(", ");

  return { absoluteMinute, label };
}

export type WeatherSetTarget = {
  key: string;
  intensity?: number;
  durationMinutes?: number;
};

export function parseWeatherSetTarget(rawInput: string): WeatherSetTarget | null {
  const parts = rawInput.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return null;
  const key = normalizeWeatherKey(parts[0]);
  if (key !== parts[0].toLocaleLowerCase("uk-UA") && parts[0].toLocaleLowerCase("uk-UA") !== "cloudy") return null;

  const intensity = parts[1] == null ? undefined : Number(parts[1]);
  const durationMinutes = parts[2] == null ? undefined : Number(parts[2]);
  return {
    key,
    intensity: Number.isFinite(intensity) ? intensity : undefined,
    durationMinutes: Number.isFinite(durationMinutes) ? durationMinutes : undefined,
  };
}

export function renderWorldTimeDebug(
  snapshot: WorldTimeSnapshot,
  state: { weatherEndsAtMinute: number | null; lastAdvancedAt: Date },
  light?: LightSnapshot,
) {
  const lines = [
    "🌒 Точний час Чорнолісу",
    "",
    `absoluteMinute: ${snapshot.absoluteMinute}`,
    `lastAdvancedAt: ${state.lastAdvancedAt.toISOString()}`,
    `Дата: ${snapshot.year} рік, ${snapshot.lunarCircleName}, день ${snapshot.dayOfCircle}`,
    `Година: ${snapshot.clockLabel}; частина доби: ${snapshot.daypart} (${snapshot.daypartLabel})`,
    `Місяць: ${snapshot.moonPhase} (${snapshot.moonPhaseLabel}); світність ${snapshot.moonIllumination}%`,
    `Погода: ${renderWeatherLine(snapshot)}; key=${snapshot.weatherKey}; intensity=${snapshot.weatherIntensity}; endsAt=${state.weatherEndsAtMinute ?? "unset"}`,
  ];

  if (light) {
    lines.push(`Світло тут: ${light.level}; score=${light.score}; natural=${light.naturalScore}; weather=${light.weatherModifier}; local=${light.hasLocalLight ? "yes" : "no"}`);
  }

  lines.push("", "Сетери: /timeSet dawn|day|dusk|night|fullmoon night|darkmoon night|HH:MM або /weatherSet clear|cloudy|mist|rain|storm [intensity] [minutes].");
  return lines.join("\n");
}
