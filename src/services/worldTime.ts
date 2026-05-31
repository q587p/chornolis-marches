export type WorldDaypart = "dawn" | "day" | "dusk" | "night";

export type WorldTimeSnapshot = {
  now: Date;
  timeZone: string;
  hour: number;
  minute: number;
  daypart: WorldDaypart;
  daypartLabel: string;
  daypartMood: string;
  isDim: boolean;
  isDark: boolean;
  source: "real-clock";
};

function envValue(key: string) {
  const runtime = globalThis as { process?: { env?: Record<string, string | undefined> } };
  return runtime.process?.env?.[key];
}

export const WORLD_TIME_TIME_ZONE = envValue("WORLD_TIME_TIME_ZONE") || "Europe/Kyiv";

const DAYPART_LABELS: Record<WorldDaypart, string> = {
  dawn: "світанок",
  day: "день",
  dusk: "присмерк",
  night: "ніч",
};

const DAYPART_MOODS: Record<WorldDaypart, string> = {
  dawn: "Світ ще тільки набирає обрисів; тіні тримаються низько, але дорога вже згадує світло.",
  day: "Світло тримає місцини відкритішими, ніж уночі.",
  dusk: "Світ стишується на межі вечора; дрібні речі вже легше загубити поглядом.",
  night: "Темрява збирається між деревами й робить світ менш певним.",
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

export function worldDaypartMood(daypart: WorldDaypart) {
  return DAYPART_MOODS[daypart];
}

function localTimeParts(now: Date, timeZone = WORLD_TIME_TIME_ZONE) {
  const parts = new Intl.DateTimeFormat("uk-UA", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");
  return {
    hour: Number.isFinite(hour) ? hour : 0,
    minute: Number.isFinite(minute) ? minute : 0,
  };
}

export function getCurrentWorldTime(now = new Date(), timeZone = WORLD_TIME_TIME_ZONE): WorldTimeSnapshot {
  const { hour, minute } = localTimeParts(now, timeZone);
  const daypart = worldDaypartForHour(hour);
  return {
    now,
    timeZone,
    hour,
    minute,
    daypart,
    daypartLabel: worldDaypartLabel(daypart),
    daypartMood: worldDaypartMood(daypart),
    isDim: daypart === "dawn" || daypart === "dusk",
    isDark: daypart === "night",
    source: "real-clock",
  };
}

export function formatWorldClock(snapshot: WorldTimeSnapshot) {
  return `${String(snapshot.hour).padStart(2, "0")}:${String(snapshot.minute).padStart(2, "0")}`;
}
