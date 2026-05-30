# World lexicon and Ukrainian cases

This document describes where world-facing names and their Ukrainian case forms should live.

Use `src/content/lexicon/worldLexicon.ts` for stable world vocabulary: creature species, NPC profession labels, spirits, resources, features and common nouns used in gameplay text.

The lexicon is now one of the content sources that must be maintained when stable world nouns are added. It is not meant to replace every grammar fallback: `src/services/grammar.ts` can still guess forms for names and ad hoc text. The important distinction is that seed helpers such as `creatureSpeciesNameFields(...)` intentionally require explicit lexicon forms where persistent world data needs reliable Ukrainian cases.

Use `src/content/onboarding/playerNames.ts` for suggested player names only.

## Why this exists

Chornolis Marches builds many sentences dynamically:

- `Ви сказали Травнику`;
- `Ви готуєтесь атакувати зайця`;
- `слід вовка`;
- `труп лисиці`;
- `Хтось нападає на мишу`.

These strings should not be assembled from raw nominative names like `заєць`, `вовк`, `лісовик` or `травник`. Every visible world noun that may be inserted into a template should have forms for all Ukrainian cases.

## Source of truth

`src/content/lexicon/worldLexicon.ts` stores entries shaped like:

```ts
{
  key: "animal.rabbit",
  kind: "creature",
  grammaticalGender: "MASCULINE",
  animacy: "ANIMATE",
  forms: {
    nominative: "заєць",
    genitive: "зайця",
    dative: "зайцю",
    accusative: "зайця",
    instrumental: "зайцем",
    locative: "зайці",
    vocative: "зайцю"
  },
  tags: ["animal", "prey", "current"]
}
```

## Recommended structure

```txt
src/
  content/
    onboarding/
      playerNames.ts        # prepared player names for onboarding
    lexicon/
      worldLexicon.ts       # creatures, professions, spirits, resources, features

  services/
    grammar.ts              # case lookup, fallback guessing and helper functions
    targets.ts              # later: shared target resolution for social/action queue
    textTemplates.ts        # later: reusable sentence templates

docs/
  content/
    player-names.md
    world-lexicon.md
```

## Integration rules

1. Prefer stored forms from Prisma for persisted species/creatures/players.
2. Seed persisted species name fields from `worldLexicon.ts` where possible; current seed species use `creatureSpeciesNameFields(...)`.
3. Use `creatureForms`, `speciesForms` and `playerForms` before inserting names into gameplay text.
4. Avoid direct `species.name` in sentences unless the sentence explicitly needs nominative.
5. Tracking labels should use genitive: `слід зайця`, `слід вовка`, `людський слід`.
6. Attack and inspect templates should use accusative/genitive/dative according to the sentence.

## Current examples

```txt
слід зайця
слід вовка
труп лисиці
Ви сказали травнику
Ви атакували зайця
Ви бачите лісовика
Ви придивляєтесь до лісовика
```

## Scope

The lexicon currently includes the active MVP nouns and several future-ready nouns:

- animals: заєць, миша, лисиця, вовк, кабан, олень, сарна, ведмідь, змія, їжак, крук, ворона, сова, сокіл, жаба, риба, пес, кіт, кінь;
- healer/profession labels: травник, травниця, мисливець, мисливиця, знахар, знахарка, відун, відунка, зелійник, зелійниця, кореняр, коренярка, лікар, лікарка, шептун, шептуха, віщун, віщунка, зіллєвар, зіллєварка;
- spirits: лісовик, стежник, лісовиця, мавка, русалка, домовик, водяник, польовик, болотник, болотниця;
- common/resources/features: труп, слід, людський слід, трави, ягоди, гриби, корінь, зілля, вогнище, незгасне вогнище.

## Follow-up cleanup

The next cleanup pass should remove remaining hardcoded nominative insertions from action, tracking and social text. Search for `species.name`, `resourceType.name`, `currentAction`, `слід:` and text fragments inside `actionQueue.ts`, `social.ts`, `locations.ts`, `worldTick.ts` and seed-related files.

This is a known incomplete state, not an accident: adding the lexicon did not automatically remove every old nominative insertion. When touching nearby code, replace direct nominative-only templates with `creatureForms`, `speciesForms`, `playerForms` or lexicon-backed helpers, but keep unrelated cleanup for a focused, testable pass.

When adding a new stable species, spirit, profession, resource or feature noun, add its case forms here first, then point seed data and grammar helpers at the lexicon instead of duplicating a local nominative-only string.
