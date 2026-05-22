export type YearBeast = {
  nominative: string;
  genitive: string;
};

export const CURRENT_WORLD_YEAR = 587;
export const WORLD_ERA_NAME = "після Великого Відступу";

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
  return `Рік ${beast.genitive} під ${sign}`;
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

export function renderCurrentWorldYearLine() {
  return `${formatCurrentWorldYear()}.`;
}