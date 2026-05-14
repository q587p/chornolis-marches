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
const CYRILLIC_NAME = /^[\p{Script=Cyrillic}][\p{Script=Cyrillic}'’\- ]{1,31}$/u;
const LATIN_NAME = /^[\p{Script=Latin}][\p{Script=Latin}'’\- ]{1,31}$/u;
const HAS_CYRILLIC = /\p{Script=Cyrillic}/u;
const HAS_LATIN = /\p{Script=Latin}/u;

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

export function normalizeCharacterName(raw: string) {
  return raw.normalize("NFKC").replace(INVISIBLE_OR_BIDI, "").replace(/\s+/g, " ").trim();
}

export function validateCharacterName(raw: string): { ok: true; value: string; script: "cyrillic" | "latin" } | { ok: false; error: string } {
  const value = normalizeCharacterName(raw);
  if (value.length < 2 || value.length > 32) return { ok: false, error: "Ім’я має бути від 2 до 32 символів." };
  if (HAS_CYRILLIC.test(value) && HAS_LATIN.test(value)) return { ok: false, error: "Не змішуйте кирилицю та латинку в одному імені." };
  if (CYRILLIC_NAME.test(value)) return { ok: true, value, script: "cyrillic" };
  if (LATIN_NAME.test(value)) return { ok: true, value, script: "latin" };
  return { ok: false, error: "Дозволені тільки кирилиця або латинка, пробіл, апостроф і дефіс." };
}

export function guessGenderFromPronoun(pronoun?: string | null): Gender {
  if (pronoun === "SHE") return "FEMININE";
  if (pronoun === "THEY") return "PLURAL";
  return "MASCULINE";
}

function declineCyrillicSingleWord(name: string, gender: Gender = "MASCULINE", animacy: Animacy = "ANIMATE"): NameForms {
  const lower = name.toLocaleLowerCase("uk-UA");
  const known = KNOWN_FORMS[lower];
  if (known) {
    return {
      nominative: name,
      genitive: known.genitive ?? name,
      dative: known.dative ?? name,
      accusative: known.accusative ?? name,
      instrumental: known.instrumental ?? name,
      locative: known.locative ?? name,
      vocative: known.vocative ?? name,
    };
  }

  if (gender === "FEMININE" || lower.endsWith("а") || lower.endsWith("я")) {
    const stem = name.slice(0, -1);
    if (lower.endsWith("я")) {
      return {
        nominative: name,
        genitive: `${stem}і`,
        dative: `${stem}і`,
        accusative: `${stem}ю`,
        instrumental: `${stem}ею`,
        locative: `${stem}і`,
        vocative: `${stem}е`,
      };
    }
    return {
      nominative: name,
      genitive: `${stem}и`,
      dative: `${stem}і`,
      accusative: `${stem}у`,
      instrumental: `${stem}ою`,
      locative: `${stem}і`,
      vocative: `${stem}о`,
    };
  }

  if (gender === "PLURAL") {
    return {
      nominative: name,
      genitive: name,
      dative: name,
      accusative: name,
      instrumental: name,
      locative: name,
      vocative: name,
    };
  }

  const genitive = `${name}а`;
  return {
    nominative: name,
    genitive,
    dative: `${name}у`,
    accusative: animacy === "ANIMATE" ? genitive : name,
    instrumental: `${name}ом`,
    locative: `${name}і`,
    vocative: `${name}е`,
  };
}

export function guessNameForms(name: string, gender: Gender = "MASCULINE", animacy: Animacy = "ANIMATE"): NameForms {
  const normalized = normalizeCharacterName(name);
  if (!HAS_CYRILLIC.test(normalized)) {
    return {
      nominative: normalized,
      genitive: normalized,
      dative: normalized,
      accusative: normalized,
      instrumental: normalized,
      locative: normalized,
      vocative: normalized,
    };
  }

  const parts = normalized.split(/\s+/);
  if (parts.length === 1) return declineCyrillicSingleWord(normalized, gender, animacy);

  const last = declineCyrillicSingleWord(parts[parts.length - 1], gender, animacy);
  const prefix = parts.slice(0, -1).join(" ");
  return {
    nominative: normalized,
    genitive: `${prefix} ${last.genitive}`,
    dative: `${prefix} ${last.dative}`,
    accusative: `${prefix} ${last.accusative}`,
    instrumental: `${prefix} ${last.instrumental}`,
    locative: `${prefix} ${last.locative}`,
    vocative: `${prefix} ${last.vocative}`,
  };
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
  const base = creature.name ? guessNameForms(creature.name, creature.species?.grammaticalGender, creature.species?.animacy) : speciesForms(creature.species);
  return {
    nominative: creature.name ?? creature.species.name,
    genitive: creature.nameGenitive ?? creature.species?.nameGenitive ?? base.genitive,
    dative: creature.nameDative ?? creature.species?.nameDative ?? base.dative,
    accusative: creature.nameAccusative ?? creature.species?.nameAccusative ?? base.accusative,
    instrumental: creature.nameInstrumental ?? creature.species?.nameInstrumental ?? base.instrumental,
    locative: creature.nameLocative ?? creature.species?.nameLocative ?? base.locative,
    vocative: creature.nameVocative ?? creature.species?.nameVocative ?? base.vocative,
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
