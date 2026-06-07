import { findLexiconEntry, requireLexiconEntry, type GrammarCase, type GrammaticalGender, type NameForms } from "../content/lexicon/worldLexicon";
import { creatureForms } from "../services/grammar";

export type ResourceDisplayGender = GrammaticalGender;

type ResourceTextInput = string | { key?: string | null; name: string };
type CorpseResourceCreature = {
  sex?: string | null;
  species: {
    key: string;
    name: string;
    nameGenitive?: string | null;
    nameDative?: string | null;
    nameAccusative?: string | null;
    nameInstrumental?: string | null;
    nameLocative?: string | null;
    nameVocative?: string | null;
  };
};

const GRAMMAR_CASES: GrammarCase[] = ["nominative", "genitive", "dative", "accusative", "instrumental", "locative", "vocative"];

const RESOURCE_ACCUSATIVE_OVERRIDES: Record<string, string> = {
  torch: "факел",
  lit_torch: "факел",
  doused_torch: "факел",
  raw_meat: "м’ясо",
  cooked_meat: "м’ясо",
};

function resourceKey(input: ResourceTextInput) {
  return typeof input === "string" ? input : input.key ?? undefined;
}

function resourceFallbackName(input: ResourceTextInput) {
  return typeof input === "string" ? input : input.name;
}

function sameForms(name: string): NameForms {
  return Object.fromEntries(GRAMMAR_CASES.map((grammarCase) => [grammarCase, name])) as NameForms;
}

function resourceLexiconEntry(key: string | null | undefined) {
  if (!key) return null;
  return findLexiconEntry(`resource.${key}`) ?? findLexiconEntry(key);
}

function corpsePhraseForms(creatureNameForms: NameForms): NameForms {
  const corpseForms = requireLexiconEntry("common.corpse").forms;
  return Object.fromEntries(
    GRAMMAR_CASES.map((grammarCase) => [grammarCase, `${corpseForms[grammarCase]} ${creatureNameForms.genitive}`])
  ) as NameForms;
}

function corpseResourceFormsFromKey(key: string) {
  const match = key.match(/^corpse_(.+?)(?:_(male|female))?$/u);
  if (!match) return null;

  const speciesKey = match[1];
  const sex = match[2]?.toUpperCase() as "MALE" | "FEMALE" | undefined;
  const speciesEntry = findLexiconEntry(`animal.${speciesKey}`) ?? findLexiconEntry(speciesKey);
  return corpseResourceForms({
    sex,
    species: {
      key: speciesKey,
      name: speciesEntry?.forms.nominative ?? speciesKey,
    },
  });
}

export function resourceForms(resourceType: ResourceTextInput): NameForms {
  const key = resourceKey(resourceType);
  if (key) {
    const corpseForms = corpseResourceFormsFromKey(key);
    if (corpseForms) return corpseForms;

    const lexiconEntry = resourceLexiconEntry(key);
    if (lexiconEntry) return { ...lexiconEntry.forms };
  }
  return sameForms(resourceFallbackName(resourceType));
}

export function resourceDisplayName(resourceType: ResourceTextInput, grammarCase: GrammarCase = "nominative") {
  return resourceForms(resourceType)[grammarCase];
}

export function resourceAccusativeName(resourceType: ResourceTextInput) {
  const key = resourceKey(resourceType);
  if (key && RESOURCE_ACCUSATIVE_OVERRIDES[key]) return RESOURCE_ACCUSATIVE_OVERRIDES[key];
  return resourceDisplayName(resourceType, "accusative");
}

export function resourceTypeGrammaticalGender(resourceType: ResourceTextInput): ResourceDisplayGender {
  const key = resourceKey(resourceType);
  const lexiconEntry = resourceLexiconEntry(key);
  return lexiconEntry?.grammaticalGender ?? "MASCULINE";
}

export function corpseResourceKey(creature: CorpseResourceCreature | { key: string }) {
  if ("species" in creature) {
    const sexSuffix = creature.sex ? `_${String(creature.sex).toLowerCase()}` : "";
    return `corpse_${creature.species.key}${sexSuffix}`;
  }
  return `corpse_${creature.key}`;
}

export function isCorpseResourceKey(key: string | null | undefined) {
  return Boolean(key?.startsWith("corpse_"));
}

export function corpseResourceForms(creature: CorpseResourceCreature): NameForms {
  return corpsePhraseForms(creatureForms(creature));
}

export function corpseResourceName(creature: CorpseResourceCreature) {
  return corpseResourceForms(creature).nominative;
}

export const resourceTypeDisplayName = resourceDisplayName;

export function resourceAmountText(name: string, amount: number) {
  return amount > 1 ? `${name} ×${amount}` : name;
}
