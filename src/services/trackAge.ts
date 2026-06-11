import { REAL_MS_PER_GAME_MINUTE } from "../data/worldClock";

export function elapsedGameMinutesBetweenDates(createdAt: Date, now = new Date()) {
  const elapsedMs = Math.max(0, now.getTime() - createdAt.getTime());
  return Math.floor(elapsedMs / REAL_MS_PER_GAME_MINUTE);
}

function pluralUk(value: number, one: string, few: string, many: string) {
  const normalized = Math.abs(Math.floor(value));
  const lastTwo = normalized % 100;
  if (lastTwo >= 11 && lastTwo <= 14) return many;
  const last = normalized % 10;
  if (last === 1) return one;
  if (last >= 2 && last <= 4) return few;
  return many;
}

export function preciseTrackAgeText(createdAt: Date, now = new Date()) {
  const gameMinutes = elapsedGameMinutesBetweenDates(createdAt, now);
  if (gameMinutes < 1) return "щойно";
  if (gameMinutes < 2) return "менше межової хвилини тому";
  if (gameMinutes < 5) return "кілька межових хвилин тому";
  if (gameMinutes < 60) {
    return `${gameMinutes} ${pluralUk(gameMinutes, "межова хвилина", "межові хвилини", "межових хвилин")} тому`;
  }
  const gameHours = Math.floor(gameMinutes / 60);
  if (gameHours < 2) {
    return gameMinutes % 60 >= 30 ? "понад межову годину тому" : "близько межової години тому";
  }
  if (gameHours < 12) {
    return `${gameHours} ${pluralUk(gameHours, "межова година", "межові години", "межових годин")} тому`;
  }
  return "давніше";
}

export function roughTrackAgeText(createdAt: Date, now = new Date()) {
  const gameMinutes = elapsedGameMinutesBetweenDates(createdAt, now);
  if (gameMinutes < 15) return "свіжий слід";
  if (gameMinutes < 120) return "недавній слід";
  return "старіший слід";
}
