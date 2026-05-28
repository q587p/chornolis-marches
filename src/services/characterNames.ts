import { validateCharacterName, normalizeCharacterName, type Gender, type NameForms } from "./grammar";

export type PreparedCharacterName = {
  key: string;
  forms: NameForms;
  origin: string;
  rarity: string;
  note?: string;
  suggestedGender: Gender;
};

export const PREPARED_CHARACTER_NAMES: PreparedCharacterName[] = [
  {
    key: "vedana",
    forms: {
      nominative: "Ведана",
      genitive: "Ведани",
      dative: "Ведані",
      accusative: "Ведану",
      instrumental: "Веданою",
      locative: "Ведані",
      vocative: "Ведано",
    },
    origin: "слов'янське прикордонне",
    rarity: "звичне",
    suggestedGender: "FEMININE",
  },
  {
    key: "danylo",
    forms: {
      nominative: "Данило",
      genitive: "Данила",
      dative: "Данилові",
      accusative: "Данила",
      instrumental: "Данилом",
      locative: "Данилові",
      vocative: "Даниле",
    },
    origin: "давньоруське / прикордонне",
    rarity: "звичне",
    suggestedGender: "MASCULINE",
  },
  {
    key: "myroslava",
    forms: {
      nominative: "Мирослава",
      genitive: "Мирослави",
      dative: "Мирославі",
      accusative: "Мирославу",
      instrumental: "Мирославою",
      locative: "Мирославі",
      vocative: "Мирославо",
    },
    origin: "слов'янське",
    rarity: "звичне",
    suggestedGender: "FEMININE",
  },
  {
    key: "oles",
    forms: {
      nominative: "Олесь",
      genitive: "Олеся",
      dative: "Олесеві",
      accusative: "Олеся",
      instrumental: "Олесем",
      locative: "Олесеві",
      vocative: "Олесю",
    },
    origin: "західнослов'янське / руське",
    rarity: "звичне",
    suggestedGender: "MASCULINE",
  },
  {
    key: "radana",
    forms: {
      nominative: "Радана",
      genitive: "Радани",
      dative: "Радані",
      accusative: "Радану",
      instrumental: "Раданою",
      locative: "Радані",
      vocative: "Радано",
    },
    origin: "слов'янське",
    rarity: "рідкісне",
    suggestedGender: "FEMININE",
  },
  {
    key: "severyn",
    forms: {
      nominative: "Северин",
      genitive: "Северина",
      dative: "Северинові",
      accusative: "Северина",
      instrumental: "Северином",
      locative: "Северинові",
      vocative: "Северине",
    },
    origin: "русько-візантійське",
    rarity: "рідкісне",
    suggestedGender: "MASCULINE",
  },
  {
    key: "tamila",
    forms: {
      nominative: "Таміла",
      genitive: "Таміли",
      dative: "Тамілі",
      accusative: "Тамілу",
      instrumental: "Тамілою",
      locative: "Тамілі",
      vocative: "Таміло",
    },
    origin: "степове / кримськотатарське відлуння",
    rarity: "рідкісне",
    suggestedGender: "FEMININE",
  },
  {
    key: "yaromyr",
    forms: {
      nominative: "Яромир",
      genitive: "Яромира",
      dative: "Яромирові",
      accusative: "Яромира",
      instrumental: "Яромиром",
      locative: "Яромирові",
      vocative: "Яромире",
    },
    origin: "слов'янське",
    rarity: "звичне",
    suggestedGender: "MASCULINE",
  },
];

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
  ["єгова", "імена богів і сакральних постатей не підходять для звичайного персонажа"],
  ["вотан", "імена богів і сакральних постатей не підходять для звичайного персонажа"],
  ["дагда", "імена богів і сакральних постатей не підходять для звичайного персонажа"],
  ["ґандальф", "надто впізнаване ім'я чужого вигаданого персонажа"],
  ["герміона", "надто впізнаване ім'я чужого вигаданого персонажа"],
]);

export function normalizeNameForRegistry(value: string) {
  return normalizeCharacterName(value).toLocaleLowerCase("uk-UA");
}

export function preparedNameByKey(key: string) {
  return PREPARED_CHARACTER_NAMES.find((name) => name.key === key) ?? null;
}

export function availablePreparedNames(usedNames: Iterable<string | null | undefined>) {
  const used = new Set(
    [...usedNames]
      .filter((name): name is string => Boolean(name))
      .map(normalizeNameForRegistry)
  );

  return PREPARED_CHARACTER_NAMES.filter((name) => !used.has(normalizeNameForRegistry(name.forms.nominative)));
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
    "",
    "Найкраще пасують слов'янські або дотичні до прикордонного світу імена. Рідкісні імена зможуть переглянути Писарі.",
    "",
    "Дозволені кирилиця або латинка без змішування абеток, emoji та невидимих символів.",
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
