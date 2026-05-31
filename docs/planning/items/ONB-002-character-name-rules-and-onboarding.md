---
id: ONB-002
title: Character name rules and onboarding
status: next
type: feature
area: onboarding
priority: high
tags:
  - onboarding
  - names
  - scribes
  - generated-names
  - ukrainian-grammar
  - validation
---

# Character name rules and onboarding

## Goal

Make character names a diegetic part of the Chornolis Marches onboarding flow instead of a loose text field.

New players should either choose a prepared name approved by scribes or enter a custom name that is checked for uniqueness, readability, Ukrainian forms and fit with the world.

Canonical design note: `docs/systems/character_names.md`.

## First scope

First playable slices added in `0.12.11`, `0.12.12` and `0.12.13`:

- The onboarding flow now asks whether the player wants a prepared name or a custom name after pronoun selection.
- Prepared names are shown with origin, rarity and stored Ukrainian case forms.
- The prepared-name pool now lives in a typed data module with an explicit reservation flag.
- Already-used or reserved prepared names are filtered out.
- Prepared-name choices are filtered by the selected pronoun/grammatical gender, with a first pool of at least 5 masculine, 5 feminine and 3 plural-form options.
- Onboarding includes a `Випадкове ім’я` button that picks from the same available prepared-name pool for the selected pronoun/grammatical gender.
- Prepared names are saved as scribe-approved.
- Custom names show a warning with examples before entry, accept Cyrillic names with ordinary name punctuation, convert fully Latin transliteration to Cyrillic for players without a Ukrainian keyboard, review all seven case forms before saving, and reject duplicates plus a first set of creature/spirit/sacred or very famous names. Name availability is checked again immediately before saving to catch stale buttons or delayed choices.
- A focused `scripts/test/character-names.cjs` regression covers prepared-name availability, reserved names and forbidden custom names.

Remaining scope:

- Move the prepared-name source from the typed data module toward DB-backed content with richer reservation state.
- Expand the reviewed prepared-name pool toward roughly a hundred names across genders, regions, rarity bands and forms of address.
- Manually review prepared-name case forms over time. Structural tests catch missing forms, duplicates and eligibility drift, but human reading is still needed for tone, rare forms and awkward vocatives.
- Expand custom-name validation against:
  - confusingly similar names;
  - NPC/significant-being names;
  - creature/species aliases and important spirits beyond the first hardcoded list;
  - random strings, profanity, famous real/fictional names and names outside the setting tone.
- Keep uncertain custom names in the existing scribe-review path instead of treating them as fully approved.

## World registry

The name registry should eventually cover:

- living player characters;
- known NPCs;
- significant creatures;
- legendary figures;
- important spirits and beings;
- reserved event/NPC names.

## Cultural layers

Prepared names should fit the borderland tone. Primary sources include Slavic, Old Rus, Baltic, Greek/Byzantine, Crimean Tatar, steppe Turkic and Vlach/Romanian layers, with rarer Scandinavian or Caucasian names only when they feel grounded.

## Acceptance notes

- A new player can pick a suitable prepared name without waiting for manual review. First slice exists in `0.12.11`; `0.12.12` adds explicit reserved-name filtering; broaden the pool later.
- A custom-name player sees clear guidance before entering a name. First warning exists in `0.12.11`.
- Scribes still have authority over rare or uncertain custom names.
- Creature names such as `Вовк`, `Миша`, `Ведмідь`, `Лісовик`, `Упир`, `Ворон`, `Кіт` and `Сокіл` are rejected or routed away from ordinary personal-name approval.
- The flow preserves Ukrainian case forms and avoids exposing raw validation mechanics as the main experience.

## Later

- Database-backed reserved names for events and NPCs.
- Regional popularity and historical layers.
- Thematic generator and larger random-name pools with regional weighting.
- Separate names, nicknames and public titles.
- Folk forms, diminutives and forms of address.
- NPC reactions to strange, foreign or ominous names.
