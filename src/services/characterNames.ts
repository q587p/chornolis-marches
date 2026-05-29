import { PREPARED_CHARACTER_NAMES } from "../data/preparedCharacterNames";
import { validateCharacterName, normalizeCharacterName, type Gender, type NameForms } from "./grammar";

export { PREPARED_CHARACTER_NAMES } from "../data/preparedCharacterNames";

export type PreparedCharacterName = {
  key: string;
  forms: NameForms;
  origin: string;
  rarity: string;
  note?: string;
  reserved?: boolean;
  reservationNote?: string;
  suggestedGender: Gender;
};

const FORBIDDEN_WORLD_NAMES = new Map<string, string>([
  ["вовк", "це радше назва істоти, ніж особове ім'я"],
  ["миша", "це радше назва істоти, ніж особове ім'я"],
  ["ведмідь", "це радше назва істоти, ніж особове ім'я"],
  ["лісовик", "це ім'я духа/істоти світу, а не звичайне людське ім'я"],
  ["упир", "це назва потвори, а не звичайне людське ім'я"],
  ["ворон", "це може читатися як істота або прізвисько, не як звичайне ім'я"],
  ["кіт", "це радше назва істоти, ніж особове ім'я"],
  ["сокіл", "це радше назва істоти або прізвисько, ніж особове ім'я"],
]);

const SACRED_OR_FAMOUS_NAMES = new Map<string, string>([
  ["сварог", "імена богів і сакральних постатей не підходять для звичайного персонажа"],
  ["свароґ", "імена богів і сакральних постатей не підходять для звичайного персонажа"],
  ["єгова", "імена богів і сакральних постатей не підходять для звичайного персонажа"],
  ["вотан", "імена богів і сакральних постатей не підходять для звичайного персонажа"],
  ["дагда", "імена богів і сакральних постатей не підходять для звичайного персонажа"],
  ["гандалф", "надто впізнаване ім'я чужого вигаданого персонажа"],
  ["гандальф", "надто впізнаване ім'я чужого вигаданого персонажа"],
  ["ґандалф", "надто впізнаване ім'я чужого вигаданого персонажа"],
  ["ґандальф", "надто впізнаване ім'я чужого вигаданого персонажа"],
  ["герміона", "надто впізнаване ім'я чужого вигаданого персонажа"],
]);

export function normalizeNameForRegistry(value: string) {
  return normalizeCharacterName(value).toLocaleLowerCase("uk-UA");
}

export function preparedNameByKey(key: string) {
  return PREPARED_CHARACTER_NAMES.find((name) => name.key === key) ?? null;
}

export function availablePreparedNames(
  usedNames: Iterable<string | null | undefined>,
  options: { suggestedGender?: Gender } = {}
) {
  const used = new Set(
    [...usedNames]
      .filter((name): name is string => Boolean(name))
      .map(normalizeNameForRegistry)
  );

  return PREPARED_CHARACTER_NAMES.filter((name) =>
    !name.reserved
    && (!options.suggestedGender || name.suggestedGender === options.suggestedGender)
    && !used.has(normalizeNameForRegistry(name.forms.nominative))
  );
}

export function randomAvailablePreparedName(
  usedNames: Iterable<string | null | undefined>,
  options: { suggestedGender?: Gender } = {}
) {
  const names = availablePreparedNames(usedNames, options);
  if (names.length === 0) return null;
  return names[Math.floor(Math.random() * names.length)];
}

export function preparedNameSummary(name: PreparedCharacterName) {
  const note = name.note ? `; ${name.note}` : "";
  return `${name.forms.nominative} — ${name.origin}; ${name.rarity}; відмінки збережені${note}`;
}

export function customNameWarningText() {
  return [
    "Введіть власне ім'я персонажа.",
    "",
    "Не підійдуть імена богів, назви істот чи духів, випадкові набори літер, грубі слова, надто відомі чужі персонажі або слова, що не звучать як особове ім'я Порубіжжя.",
    "Наприклад: <b>Сварог</b> (бог), <b>Лісовик</b> або <b>Вовк</b> (дух чи істота), <b>Фффрр</b> (набір літер), лайка й образи, <b>Ґандальф</b> або <b>Герміона</b> (чужі впізнавані персонажі), <b>Камінь</b> чи <b>Стежка</b> (слова, не особові імена).",
    "",
    "Найкраще пасують слов'янські або дотичні до прикордонного світу імена. Рідкісні імена зможуть переглянути Писарі.",
    "",
    "Дозволені кирилиця, пробіл, дефіс і апостроф у межах імені. Якщо немає української клавіатури, напишіть ім’я транслітом латинкою: наприклад, <b>Zdravko</b> стане <b>Здравко</b>. Змішувати абетки, додавати цифри, emoji чи невидимі символи не можна.",
  ].join("\n");
}

export function validateCustomCharacterName(raw: string) {
  const validation = validateCharacterName(raw);
  if (!validation.ok) return validation;

  const normalized = normalizeNameForRegistry(validation.value);
  const forbiddenReason = FORBIDDEN_WORLD_NAMES.get(normalized) ?? SACRED_OR_FAMOUS_NAMES.get(normalized);
  if (forbiddenReason) {
    return {
      ok: false as const,
      error: `Це ім'я не підходить: ${forbiddenReason}. Оберіть інше або візьміть готове ім'я зі списку.`,
    };
  }

  return validation;
}
