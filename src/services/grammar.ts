export type GrammarCase =
  | "nominative"
  | "genitive"
  | "dative"
  | "accusative"
  | "instrumental"
  | "locative"
  | "vocative";

export type NameForms = Record<GrammarCase, string>;
export type Gender = "MASCULINE" | "FEMININE" | "NEUTER" | "PLURAL";
export type Animacy = "ANIMATE" | "INANIMATE";

const INVISIBLE_OR_BIDI = /[\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/g;
const CYRILLIC_NAME = /^[\p{Script=Cyrillic}](?:[\p{Script=Cyrillic}\p{Mark}]|[ '’ʼʻʹ`´\-‐‑‒–](?=[\p{Script=Cyrillic}])){1,63}$/u;
const LATIN_NAME = /^[A-Za-z](?:[A-Za-z]|[ '’ʼʻʹ`´\-‐‑‒–](?=[A-Za-z])){1,63}$/u;
const HAS_CYRILLIC = /\p{Script=Cyrillic}/u;
const HAS_LATIN = /\p{Script=Latin}/u;
const LATIN_NAME_SEPARATOR = /([ '’ʼʻʹ`´\-‐‑‒–]+)/;
const LATIN_VOWELS = new Set(["a", "e", "i", "o", "u", "y"]);

const INDECLINABLE_PARTS = new Set([
  "де",
  "фон",
  "ван",
  "аль",
  "ал",
  "ель",
  "ібн",
  "бін",
  "огли",
  "кизи",
  "ла",
  "ле",
  "да",
  "ді",
  "дю",
]);

const KNOWN_FORMS: Record<string, Partial<NameForms> & { gender?: Gender; animacy?: Animacy }> = {
  "заєць": {
    genitive: "зайця",
    dative: "зайцю",
    accusative: "зайця",
    instrumental: "зайцем",
    locative: "зайці",
    vocative: "зайцю",
    gender: "MASCULINE",
    animacy: "ANIMATE",
  },
  "миша": {
    genitive: "миші",
    dative: "миші",
    accusative: "мишу",
    instrumental: "мишею",
    locative: "миші",
    vocative: "мише",
    gender: "FEMININE",
    animacy: "ANIMATE",
  },
  "лисиця": {
    genitive: "лисиці",
    dative: "лисиці",
    accusative: "лисицю",
    instrumental: "лисицею",
    locative: "лисиці",
    vocative: "лисице",
    gender: "FEMININE",
    animacy: "ANIMATE",
  },
  "вовк": {
    genitive: "вовка",
    dative: "вовку",
    accusative: "вовка",
    instrumental: "вовком",
    locative: "вовку",
    vocative: "вовче",
    gender: "MASCULINE",
    animacy: "ANIMATE",
  },
  "лісовик": {
    genitive: "лісовика",
    dative: "лісовику",
    accusative: "лісовика",
    instrumental: "лісовиком",
    locative: "лісовику",
    vocative: "лісовику",
    gender: "MASCULINE",
    animacy: "ANIMATE",
  },
  "травник": {
    genitive: "травника",
    dative: "травнику",
    accusative: "травника",
    instrumental: "травником",
    locative: "травнику",
    vocative: "травнику",
    gender: "MASCULINE",
    animacy: "ANIMATE",
  },
};

const KNOWN_SEXED_SPECIES_FORMS: Record<string, Partial<Record<"MALE" | "FEMALE", NameForms>>> = {
  rabbit: {
    MALE: {
      nominative: "заєць",
      genitive: "зайця",
      dative: "зайцеві",
      accusative: "зайця",
      instrumental: "зайцем",
      locative: "зайцеві",
      vocative: "зайцю",
    },
    FEMALE: {
      nominative: "зайчиха",
      genitive: "зайчихи",
      dative: "зайчисі",
      accusative: "зайчиху",
      instrumental: "зайчихою",
      locative: "зайчисі",
      vocative: "зайчихо",
    },
  },
  fox: {
    MALE: {
      nominative: "лис",
      genitive: "лиса",
      dative: "лисові",
      accusative: "лиса",
      instrumental: "лисом",
      locative: "лисові",
      vocative: "лисе",
    },
    FEMALE: {
      nominative: "лисиця",
      genitive: "лисиці",
      dative: "лисиці",
      accusative: "лисицю",
      instrumental: "лисицею",
      locative: "лисиці",
      vocative: "лисице",
    },
  },
  wolf: {
    MALE: {
      nominative: "вовк",
      genitive: "вовка",
      dative: "вовкові",
      accusative: "вовка",
      instrumental: "вовком",
      locative: "вовкові",
      vocative: "вовче",
    },
    FEMALE: {
      nominative: "вовчиця",
      genitive: "вовчиці",
      dative: "вовчиці",
      accusative: "вовчицю",
      instrumental: "вовчицею",
      locative: "вовчиці",
      vocative: "вовчице",
    },
  },
};

export function normalizeCharacterName(raw: string) {
  return raw
    .normalize("NFKC")
    .replace(INVISIBLE_OR_BIDI, "")
    .replace(/\s+/g, " ")
    .trim();
}

function preserveLatinNameCase(original: string, transliterated: string) {
  if (original === original.toLocaleUpperCase("en-US")) return transliterated.toLocaleUpperCase("uk-UA");
  if (original[0] === original[0].toLocaleUpperCase("en-US")) {
    return transliterated[0].toLocaleUpperCase("uk-UA") + transliterated.slice(1);
  }
  return transliterated;
}

function transliterateLatinNameWord(word: string) {
  const lower = word.toLocaleLowerCase("en-US");
  let result = "";
  let index = 0;

  while (index < lower.length) {
    const rest = lower.slice(index);
    const previous = index > 0 ? lower[index - 1] : "";

    if (rest.startsWith("shch")) {
      result += "щ";
      index += 4;
    } else if (rest.startsWith("sch")) {
      result += "щ";
      index += 3;
    } else if (rest.startsWith("iia")) {
      result += "ія";
      index += 3;
    } else if ((rest.startsWith("ii") || rest.startsWith("iy")) && index + 2 === lower.length) {
      result += "ій";
      index += 2;
    } else if (rest.startsWith("zh")) {
      result += "ж";
      index += 2;
    } else if (rest.startsWith("kh")) {
      result += "х";
      index += 2;
    } else if (rest.startsWith("ch")) {
      result += "ч";
      index += 2;
    } else if (rest.startsWith("sh")) {
      result += "ш";
      index += 2;
    } else if (rest.startsWith("ts")) {
      result += "ц";
      index += 2;
    } else if (rest.startsWith("ye")) {
      result += "є";
      index += 2;
    } else if (rest.startsWith("yi")) {
      result += "ї";
      index += 2;
    } else if (rest.startsWith("yu")) {
      result += "ю";
      index += 2;
    } else if (rest.startsWith("ya")) {
      result += "я";
      index += 2;
    } else if (rest.startsWith("yo")) {
      result += "йо";
      index += 2;
    } else if (rest.startsWith("iu")) {
      result += "ю";
      index += 2;
    } else if (rest.startsWith("ia") && index + 2 === lower.length) {
      result += "ія";
      index += 2;
    } else {
      const letter = lower[index];
      const mapped = ({
        a: "а",
        b: "б",
        c: "к",
        d: "д",
        e: "е",
        f: "ф",
        g: "ґ",
        h: "г",
        i: "і",
        j: "й",
        k: "к",
        l: "л",
        m: "м",
        n: "н",
        o: "о",
        p: "п",
        q: "к",
        r: "р",
        s: "с",
        t: "т",
        u: "у",
        v: "в",
        w: "в",
        x: "кс",
        y: index === 0 || LATIN_VOWELS.has(previous) ? "й" : "и",
        z: "з",
      } as Record<string, string>)[letter] ?? letter;
      result += mapped;
      index += 1;
    }
  }

  return preserveLatinNameCase(word, result);
}

function transliterateLatinName(value: string) {
  return value
    .split(LATIN_NAME_SEPARATOR)
    .map((part) => LATIN_NAME_SEPARATOR.test(part) ? part : transliterateLatinNameWord(part))
    .join("");
}

export function validateCharacterName(raw: string): { ok: true; value: string; script: "cyrillic" | "latin-translit" } | { ok: false; error: string } {
  const value = normalizeCharacterName(raw);
  if (value.length < 2 || value.length > 64) return { ok: false, error: "Ім’я має бути від 2 до 64 символів." };
  if (CYRILLIC_NAME.test(value)) return { ok: true, value, script: "cyrillic" };
  if (HAS_CYRILLIC.test(value) && HAS_LATIN.test(value)) return { ok: false, error: "Не змішуйте кирилицю й латинку в одному імені. Напишіть кирилицею або повністю транслітом." };
  if (HAS_LATIN.test(value)) {
    if (!LATIN_NAME.test(value)) return { ok: false, error: "Транслітом можна писати тільки латинські літери, пробіл, дефіс і апостроф в межах імені." };
    const transliterated = transliterateLatinName(value);
    if (CYRILLIC_NAME.test(transliterated)) return { ok: true, value: transliterated, script: "latin-translit" };
  }
  return { ok: false, error: "Дозволені кирилиця, пробіл, дефіс і апостроф в межах імені. Якщо немає української клавіатури, напишіть ім’я транслітом латинкою." };
}

export function guessGenderFromPronoun(pronoun?: string | null): Gender {
  if (pronoun === "SHE") return "FEMININE";
  if (pronoun === "THEY") return "PLURAL";
  return "MASCULINE";
}

function preserveCase(original: string, declined: string) {
  if (original === original.toLocaleUpperCase("uk-UA")) return declined.toLocaleUpperCase("uk-UA");
  const first = original[0];
  if (first === first.toLocaleUpperCase("uk-UA")) {
    return declined[0].toLocaleUpperCase("uk-UA") + declined.slice(1);
  }
  return declined;
}

function sameForms(value: string): NameForms {
  return {
    nominative: value,
    genitive: value,
    dative: value,
    accusative: value,
    instrumental: value,
    locative: value,
    vocative: value,
  };
}

function masculineAdjectiveForms(word: string, animacy: Animacy = "ANIMATE") {
  const lower = word.toLocaleLowerCase("uk-UA");
  if (!lower.endsWith("ий")) return null;

  const stem = word.slice(0, -2);
  const genitive = `${stem}ого`;
  return {
    nominative: word,
    genitive: preserveCase(word, genitive),
    dative: preserveCase(word, `${stem}ому`),
    accusative: preserveCase(word, animacy === "ANIMATE" ? genitive : word),
    instrumental: preserveCase(word, `${stem}им`),
    locative: preserveCase(word, `${stem}ому`),
    vocative: word,
  } satisfies NameForms;
}

function declineCyrillicSimpleWord(
  word: string,
  gender: Gender = "MASCULINE",
  animacy: Animacy = "ANIMATE",
  options: { descriptor?: boolean } = {}
): NameForms {
  const lower = word.toLocaleLowerCase("uk-UA");

  if (INDECLINABLE_PARTS.has(lower)) return sameForms(word);

  const known = KNOWN_FORMS[lower];
  if (known) {
    return {
      nominative: word,
      genitive: preserveCase(word, known.genitive ?? word),
      dative: preserveCase(word, known.dative ?? word),
      accusative: preserveCase(word, known.accusative ?? word),
      instrumental: preserveCase(word, known.instrumental ?? word),
      locative: preserveCase(word, known.locative ?? word),
      vocative: preserveCase(word, known.vocative ?? word),
    };
  }

  if (options.descriptor && gender === "MASCULINE") {
    const adjective = masculineAdjectiveForms(word, animacy);
    if (adjective) return adjective;
  }

  if (gender === "FEMININE" || lower.endsWith("а") || lower.endsWith("я")) {
    const stem = word.slice(0, -1);
    if (lower.endsWith("я")) {
      return {
        nominative: word,
        genitive: `${stem}і`,
        dative: `${stem}і`,
        accusative: `${stem}ю`,
        instrumental: `${stem}ею`,
        locative: `${stem}і`,
        vocative: `${stem}е`,
      };
    }
    return {
      nominative: word,
      genitive: `${stem}и`,
      dative: `${stem}і`,
      accusative: `${stem}у`,
      instrumental: `${stem}ою`,
      locative: `${stem}і`,
      vocative: `${stem}о`,
    };
  }

  if (gender === "PLURAL") {
    return sameForms(word);
  }

  if (lower.endsWith("о") || lower.endsWith("е")) {
    return sameForms(word);
  }

  const genitive = `${word}а`;
  return {
    nominative: word,
    genitive,
    dative: `${word}у`,
    accusative: animacy === "ANIMATE" ? genitive : word,
    instrumental: `${word}ом`,
    locative: `${word}і`,
    vocative: `${word}е`,
  };
}

function joinHyphenatedForms(parts: NameForms[]): NameForms {
  return {
    nominative: parts.map((p) => p.nominative).join("-"),
    genitive: parts.map((p) => p.genitive).join("-"),
    dative: parts.map((p) => p.dative).join("-"),
    accusative: parts.map((p) => p.accusative).join("-"),
    instrumental: parts.map((p) => p.instrumental).join("-"),
    locative: parts.map((p) => p.locative).join("-"),
    vocative: parts.map((p) => p.vocative).join("-"),
  };
}

function declineCyrillicNamePart(
  part: string,
  gender: Gender = "MASCULINE",
  animacy: Animacy = "ANIMATE",
  options: { descriptor?: boolean } = {}
): NameForms {
  if (!part.includes("-")) return declineCyrillicSimpleWord(part, gender, animacy, options);

  const forms = part
    .split("-")
    .map((piece) => declineCyrillicSimpleWord(piece, gender, animacy, options));

  return joinHyphenatedForms(forms);
}

function joinWordForms(parts: NameForms[]): NameForms {
  return {
    nominative: parts.map((p) => p.nominative).join(" "),
    genitive: parts.map((p) => p.genitive).join(" "),
    dative: parts.map((p) => p.dative).join(" "),
    accusative: parts.map((p) => p.accusative).join(" "),
    instrumental: parts.map((p) => p.instrumental).join(" "),
    locative: parts.map((p) => p.locative).join(" "),
    vocative: parts.map((p) => p.vocative).join(" "),
  };
}

export function guessNameForms(name: string, gender: Gender = "MASCULINE", animacy: Animacy = "ANIMATE"): NameForms {
  const normalized = normalizeCharacterName(name);
  if (!HAS_CYRILLIC.test(normalized)) return sameForms(normalized);

  const parts = normalized
    .split(/\s+/)
    .filter(Boolean);

  const declined = parts.map((part, index) =>
    declineCyrillicNamePart(part, gender, animacy, { descriptor: index < parts.length - 1 })
  );

  return joinWordForms(declined);
}

export function speciesForms(species: any): NameForms {
  const fallback = guessNameForms(species.name, species.grammaticalGender, species.animacy);
  return {
    nominative: species.name,
    genitive: species.nameGenitive ?? fallback.genitive,
    dative: species.nameDative ?? fallback.dative,
    accusative: species.nameAccusative ?? fallback.accusative,
    instrumental: species.nameInstrumental ?? fallback.instrumental,
    locative: species.nameLocative ?? fallback.locative,
    vocative: species.nameVocative ?? fallback.vocative,
  };
}

export function creatureForms(creature: any): NameForms {
  const speciesKey = typeof creature.species?.key === "string" ? creature.species.key : undefined;
  const sex: "MALE" | "FEMALE" | undefined = creature.sex === "MALE" || creature.sex === "FEMALE" ? creature.sex : undefined;
  const sexedSpeciesForms = speciesKey && sex ? KNOWN_SEXED_SPECIES_FORMS[speciesKey]?.[sex] : undefined;
  const base = creature.name
    ? guessNameForms(creature.name, creature.species?.grammaticalGender, creature.species?.animacy)
    : sexedSpeciesForms ?? speciesForms(creature.species);
  return {
    nominative: creature.name ?? sexedSpeciesForms?.nominative ?? creature.species.name,
    genitive: creature.nameGenitive ?? sexedSpeciesForms?.genitive ?? creature.species?.nameGenitive ?? base.genitive,
    dative: creature.nameDative ?? sexedSpeciesForms?.dative ?? creature.species?.nameDative ?? base.dative,
    accusative: creature.nameAccusative ?? sexedSpeciesForms?.accusative ?? creature.species?.nameAccusative ?? base.accusative,
    instrumental: creature.nameInstrumental ?? sexedSpeciesForms?.instrumental ?? creature.species?.nameInstrumental ?? base.instrumental,
    locative: creature.nameLocative ?? sexedSpeciesForms?.locative ?? creature.species?.nameLocative ?? base.locative,
    vocative: creature.nameVocative ?? sexedSpeciesForms?.vocative ?? creature.species?.nameVocative ?? base.vocative,
  };
}

export function playerForms(player: any): NameForms {
  const name = player.nameNominative ?? player.firstName ?? player.username ?? "мандрівник";
  const fallback = guessNameForms(name, player.grammaticalGender ?? "MASCULINE", player.animacy ?? "ANIMATE");
  return {
    nominative: name,
    genitive: player.nameGenitive ?? fallback.genitive,
    dative: player.nameDative ?? fallback.dative,
    accusative: player.nameAccusative ?? fallback.accusative,
    instrumental: player.nameInstrumental ?? fallback.instrumental,
    locative: player.nameLocative ?? fallback.locative,
    vocative: player.nameVocative ?? fallback.vocative,
  };
}
