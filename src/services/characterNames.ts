import { PREPARED_CHARACTER_NAMES } from "../data/preparedCharacterNames";
import { validateCharacterName, normalizeCharacterName, type Gender, type NameForms } from "./grammar";
import { escapeHtml } from "../utils/text";

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

export type NameChoiceTextIntent = "prepared" | "random" | "customPrompt" | "customName";

export const PREPARED_NAME_PAGE_SIZE = 6;

const FORBIDDEN_WORLD_NAMES = new Map<string, string>([
  ["вовк", "це радше назва істоти, ніж особове ім'я"],
  ["вовчиця", "це радше назва істоти, ніж особове ім'я"],
  ["миша", "це радше назва істоти, ніж особове ім'я"],
  ["заєць", "це радше назва істоти, ніж особове ім'я"],
  ["зайчиха", "це радше назва істоти, ніж особове ім'я"],
  ["лис", "це радше назва істоти, ніж особове ім'я"],
  ["лисиця", "це радше назва істоти, ніж особове ім'я"],
  ["ведмідь", "це радше назва істоти, ніж особове ім'я"],
  ["лісовик", "це ім'я духа/істоти світу, а не звичайне людське ім'я"],
  ["дідлісовик", "це ім'я духа/істоти світу, а не звичайне людське ім'я"],
  ["дідчорноліс", "це ім'я духа/істоти світу, а не звичайне людське ім'я"],
  ["сон", "це ім'я навчального голосу/сили світу, а не звичайне людське ім'я"],
  ["дрімота", "це ім'я навчального голосу/сили світу, а не звичайне людське ім'я"],
  ["мара", "це ім'я духа/сили світу, а не звичайне людське ім'я"],
  ["упир", "це назва потвори, а не звичайне людське ім'я"],
  ["потвора", "це назва істоти, а не звичайне людське ім'я"],
  ["ворон", "це може читатися як істота або прізвисько, не як звичайне ім'я"],
  ["кіт", "це радше назва істоти, ніж особове ім'я"],
  ["сокіл", "це радше назва істоти або прізвисько, ніж особове ім'я"],
  ["камінь", "це радше звичайне слово або прізвисько, ніж особове ім'я"],
  ["стежка", "це радше звичайне слово або прізвисько, ніж особове ім'я"],
]);

const SACRED_OR_FAMOUS_NAMES = new Map<string, string>([
  ["сварог", "імена богів і сакральних постатей не підходять для звичайного персонажа"],
  ["свароґ", "імена богів і сакральних постатей не підходять для звичайного персонажа"],
  ["єгова", "імена богів і сакральних постатей не підходять для звичайного персонажа"],
  ["вотан", "імена богів і сакральних постатей не підходять для звичайного персонажа"],
  ["одін", "імена богів і сакральних постатей не підходять для звичайного персонажа"],
  ["дагда", "імена богів і сакральних постатей не підходять для звичайного персонажа"],
  ["гермес", "імена богів і сакральних постатей не підходять для звичайного персонажа"],
  ["герместрисмегіст", "імена богів і сакральних постатей не підходять для звичайного персонажа"],
  ["гандалф", "надто впізнаване ім'я чужого вигаданого персонажа"],
  ["гандальф", "надто впізнаване ім'я чужого вигаданого персонажа"],
  ["ґандалф", "надто впізнаване ім'я чужого вигаданого персонажа"],
  ["ґандальф", "надто впізнаване ім'я чужого вигаданого персонажа"],
  ["герміона", "надто впізнаване ім'я чужого вигаданого персонажа"],
]);

const NAME_SEPARATOR_CHARS = /[\s'ʼʻ՚`´\-‐‑‒–—]+/g;

function normalizeForbiddenNameKey(value: string) {
  return normalizeNameForRegistry(value)
    .replace(NAME_SEPARATOR_CHARS, "")
    .replace(/ґ/g, "г");
}

export function normalizeNameForRegistry(value: string) {
  return normalizeCharacterName(value).toLocaleLowerCase("uk-UA");
}

export function onboardingNameChoiceTextIntent(text: string): NameChoiceTextIntent | null {
  const normalized = text.trim().toLocaleLowerCase("uk-UA");
  if (!normalized || normalized.startsWith("/")) return null;
  if (["список", "обрати", "обрати ім'я зі списку", "готове", "готові", "готове ім'я", "готові імена"].includes(normalized)) return "prepared";
  if (["випадкове", "випадкове ім'я", "рандом", "навмання"].includes(normalized)) return "random";
  if (["власне", "своє", "ввести", "ввести власне ім'я", "власне ім'я", "своє ім'я"].includes(normalized)) return "customPrompt";
  return "customName";
}

export function preparedNameByKey(key: string) {
  return PREPARED_CHARACTER_NAMES.find((name) => name.key === key) ?? null;
}

export function preparedNameByNominative(nominative: string | null | undefined) {
  if (!nominative) return null;
  const normalized = normalizeNameForRegistry(nominative);
  return PREPARED_CHARACTER_NAMES.find((name) => normalizeNameForRegistry(name.forms.nominative) === normalized) ?? null;
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

export function paginatePreparedNames<T>(
  names: readonly T[],
  requestedPage: number,
  pageSize = PREPARED_NAME_PAGE_SIZE
) {
  const safePageSize = Math.max(1, Math.floor(pageSize));
  const total = names.length;
  const pageCount = Math.max(1, Math.ceil(total / safePageSize));
  const rawPage = Number.isFinite(requestedPage) ? Math.trunc(requestedPage) : 0;
  const page = Math.min(Math.max(rawPage, 0), pageCount - 1);
  const startIndex = page * safePageSize;
  const endIndex = Math.min(startIndex + safePageSize, total);

  return {
    items: names.slice(startIndex, endIndex),
    page,
    pageCount,
    pageSize: safePageSize,
    total,
    startIndex,
    endIndex,
    hasPrevious: page > 0,
    hasNext: page < pageCount - 1,
  };
}

export function preparedNameSummary(name: PreparedCharacterName) {
  const note = name.note ? `; ${name.note}` : "";
  return `${name.forms.nominative} — ${name.origin}; ${name.rarity}; відмінки збережені${note}`;
}

export function preparedNameCompactSummary(name: PreparedCharacterName) {
  const note = name.note ? `; ${name.note}` : "";
  return `${name.forms.nominative} — ${name.origin}; ${name.rarity}${note}`;
}

export function customNameWarningText(options: { examples?: string[] } = {}) {
  const examples = (options.examples ?? []).filter(Boolean).slice(0, 3);
  const exampleLines = examples.length
    ? [
        "",
        `Приклади доступних імен: ${examples.map((name) => `<b>${escapeHtml(name)}</b>`).join(", ")}.`,
      ]
    : [];

  return [
    "Введіть власне ім'я персонажа.",
    ...exampleLines,
    "",
    "Не підійдуть імена богів, назви істот чи духів, випадкові набори літер, грубі слова, надто відомі чужі персонажі або слова, що не звучать як особове ім'я Порубіжжя.",
    "Наприклад: <b>Сварог</b> (бог), <b>Лісовик</b> або <b>Вовк</b> (дух чи істота), <b>Фффрр</b> (набір літер), лайка й образи, <b>Ґандальф</b> або <b>Герміона</b> (чужі впізнавані персонажі), <b>Камінь</b> чи <b>Стежка</b> (слова, не особові імена).",
    "",
    "Підготовлені імена вже перевірені Писарями. Власне ім'я можна носити одразу, але воно ще чекатиме їхнього тихого перегляду.",
    "",
    "Найкраще пасують слов'янські або дотичні до прикордонного світу імена.",
    "",
    "Дозволені кирилиця, пробіл, дефіс і апостроф у межах імені. Якщо немає української клавіатури, напишіть ім’я транслітом латинкою: наприклад, <b>Zdravko</b> стане <b>Здравко</b>. Змішувати абетки, додавати цифри, emoji чи невидимі символи не можна.",
  ].join("\n");
}

export function validateCustomCharacterName(raw: string) {
  const validation = validateCharacterName(raw);
  if (!validation.ok) return validation;

  const normalized = normalizeForbiddenNameKey(validation.value);
  const forbiddenReason = FORBIDDEN_WORLD_NAMES.get(normalized) ?? SACRED_OR_FAMOUS_NAMES.get(normalized);
  if (forbiddenReason) {
    return {
      ok: false as const,
      error: `Це ім'я не підходить: ${forbiddenReason}. Оберіть інше або візьміть готове ім'я зі списку.`,
    };
  }

  return validation;
}

export function characterNameApprovalStatusText(isApproved: boolean) {
  return isApproved
    ? "Ім’я вже схвалене Писарями Порубіжжя."
    : "Ім’я можна носити вже зараз, але воно ще чекає на перегляд Писарями Порубіжжя.";
}

export function onboardingNameApprovalNote(isApproved: boolean) {
  return isApproved
    ? "Це підготовлене ім’я вже перевірене Писарями, тож його одразу внесено до літопису."
    : "Це власне ім’я вже відкриває шлях у Порубіжжя, але Писарі ще можуть переглянути його пізніше.";
}
