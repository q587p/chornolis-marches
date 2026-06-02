import { START_WORLD_ABSOLUTE_MINUTE, worldTimeSnapshotFromAbsoluteMinute, type WorldTimeSnapshot } from "../data/worldClock";
import { lightSnapshotFromWorldTime } from "./lightSnapshot";
import { renderWeatherLine } from "./weather";

export type YearBeast = {
  nominative: string;
  genitive: string;
};

export const CURRENT_WORLD_YEAR = 587;
export const WORLD_ERA_NAME = "після Великого Відступу";

// Public season stays simple until the weather/season slice lands.
export const CURRENT_WORLD_SEASON = "пізня весна";
export const CURRENT_WORLD_MOON_CIRCLE = "Коло Зеленого Шуму";
export const CURRENT_WORLD_DAY = 17;
export const CURRENT_WORLD_DAYTIME = "передвечір’я";

export const YEAR_BEASTS: YearBeast[] = [
  { nominative: "Полівка", genitive: "Полівки" },
  { nominative: "Заєць", genitive: "Зайця" },
  { nominative: "Лис", genitive: "Лиса" },
  { nominative: "Вовк", genitive: "Вовка" },
  { nominative: "Рись", genitive: "Рисі" },
  { nominative: "Вепр", genitive: "Вепра" },
  { nominative: "Олень", genitive: "Оленя" },
  { nominative: "Тур", genitive: "Тура" },
  { nominative: "Ведмідь", genitive: "Ведмедя" },
  { nominative: "Ворон", genitive: "Ворона" },
  { nominative: "Сич", genitive: "Сича" },
  { nominative: "Журавель", genitive: "Журавля" },
  { nominative: "Змій", genitive: "Змія" },
];

export const YEAR_SIGNS = [
  "Молодим Коренем",
  "Мокрою Стежкою",
  "Тихим Вітром",
  "Гострим Серпом",
  "Червоним Жаром",
  "Медовою Водою",
  "Чорною Землею",
  "Сніговою Межею",
  "Вербовим Димом",
  "Сліпим Дощем",
  "Нічним Коренем",
  "Кривою Стежкою",
  "Довгою Тінню",
];

const YEAR_BEAST_OFFSET = 8;
const YEAR_SIGN_OFFSET = 0;
const YEAR_CYCLE_LENGTH = 13;

function cycleIndex(year: number, offset: number) {
  return ((year + offset) % YEAR_CYCLE_LENGTH + YEAR_CYCLE_LENGTH) % YEAR_CYCLE_LENGTH;
}

export function getWorldYearBeast(year = CURRENT_WORLD_YEAR) {
  return YEAR_BEASTS[cycleIndex(year, YEAR_BEAST_OFFSET)];
}

export function getWorldYearSign(year = CURRENT_WORLD_YEAR) {
  return YEAR_SIGNS[cycleIndex(year, YEAR_SIGN_OFFSET)];
}

export function getWorldYearName(year = CURRENT_WORLD_YEAR) {
  const beast = getWorldYearBeast(year);
  const sign = getWorldYearSign(year);
  return `рік ${beast.genitive} під ${sign}`;
}

export function formatWorldYearShort(year = CURRENT_WORLD_YEAR) {
  return `${year} літо ${WORLD_ERA_NAME}`;
}

export function formatWorldYear(year = CURRENT_WORLD_YEAR) {
  return `${formatWorldYearShort(year)} — ${getWorldYearName(year)}`;
}

export function formatCurrentWorldYear() {
  return formatWorldYear(CURRENT_WORLD_YEAR);
}

export function renderWorldYearLine(year = CURRENT_WORLD_YEAR) {
  return `${formatWorldYear(year)}.`;
}

export function renderWorldDreamDateLine(snapshot = worldTimeSnapshotFromAbsoluteMinute(START_WORLD_ABSOLUTE_MINUTE)) {
  return `${formatWorldYear(snapshot.year)}, ${snapshot.lunarCircleName}, ${snapshot.dayOfCircle} день.`;
}

export function renderCurrentWorldYearLine() {
  return renderWorldYearLine(CURRENT_WORLD_YEAR);
}

function worldDaypartMood(snapshot: WorldTimeSnapshot) {
  if (snapshot.daypart === "dawn") return "Світ ще тільки набирає обрисів; тіні тримаються низько, але дорога вже згадує світло.";
  if (snapshot.daypart === "day" && snapshot.hour >= 16) return "День хилиться до вечора. Світло ще тримається, але тіні вже уважніші.";
  if (snapshot.daypart === "day") return "Світло тримає місцини відкритішими, ніж уночі.";
  if (snapshot.daypart === "dusk") return "Світ стишується на межі вечора; дрібні речі вже легше загубити поглядом.";
  return "Темрява збирається між деревами й робить світ менш певним.";
}

const HOUR_GENITIVE = [
  "дванадцятої",
  "першої",
  "другої",
  "третьої",
  "четвертої",
  "п'ятої",
  "шостої",
  "сьомої",
  "восьмої",
  "дев'ятої",
  "десятої",
  "одинадцятої",
];

const HOUR_LOCATIVE = [
  "дванадцятій",
  "першій",
  "другій",
  "третій",
  "четвертій",
  "п'ятій",
  "шостій",
  "сьомій",
  "восьмій",
  "дев'ятій",
  "десятій",
  "одинадцятій",
];

const HOUR_NOMINATIVE = [
  "дванадцята",
  "перша",
  "друга",
  "третя",
  "четверта",
  "п'ята",
  "шоста",
  "сьома",
  "восьма",
  "дев'ята",
  "десята",
  "одинадцята",
];

function hourWordIndex(hour: number) {
  return ((hour % 12) + 12) % 12;
}

function hourPeriodLabel(hour: number) {
  if (hour >= 0 && hour <= 4) return "ночі";
  if (hour >= 5 && hour <= 11) return "ранку";
  if (hour === 12) return "дня";
  if (hour >= 13 && hour <= 17) return "після полудня";
  if (hour >= 18 && hour <= 20) return "вечора";
  return "ночі";
}

export function renderApproximateWorldClock(snapshot: Pick<WorldTimeSnapshot, "hour" | "minute">) {
  const current = hourWordIndex(snapshot.hour);
  const nextHour = (snapshot.hour + 1) % 24;
  const next = hourWordIndex(nextHour);
  const currentPeriod = hourPeriodLabel(snapshot.hour);
  const nextPeriod = hourPeriodLabel(nextHour);

  if (snapshot.minute < 10) return `близько ${HOUR_GENITIVE[current]} ${currentPeriod}`;
  if (snapshot.minute < 35) return `трохи по ${HOUR_LOCATIVE[current]} ${currentPeriod}`;
  if (snapshot.minute < 50) return `ближче до ${HOUR_GENITIVE[next]} ${nextPeriod}`;
  return `майже ${HOUR_NOMINATIVE[next]} ${nextPeriod}`;
}

export function renderCurrentWorldTime(snapshot = worldTimeSnapshotFromAbsoluteMinute(START_WORLD_ABSOLUTE_MINUTE)) {
  const daypartLabel = snapshot.daypart === "day" && snapshot.hour >= 16 ? "передвечір'я" : snapshot.daypartLabel;
  const light = lightSnapshotFromWorldTime(snapshot);
  return [
    "🌒 Час Порубіжжя",
    "",
    `${formatWorldYear(snapshot.year)}.`,
    `Пора: ${CURRENT_WORLD_SEASON}.`,
    `Місячне коло: ${snapshot.lunarCircleName}.`,
    `День кола: ${snapshot.dayOfCircle}.`,
    `Час доби: ${daypartLabel}.`,
    `Межовий час: ${renderApproximateWorldClock(snapshot)}.`,
    `Місяць: ${snapshot.moonPhaseLabel}.`,
    `Погода: ${renderWeatherLine(snapshot)}.`,
    `Світло: ${light.label}.`,
    "",
    worldDaypartMood(snapshot),
  ].join("\n");
}
