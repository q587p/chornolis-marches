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

First playable slice added in `0.12.11`:

- The onboarding flow now asks whether the player wants a prepared name or a custom name after pronoun selection.
- Prepared names are shown with origin, rarity and stored Ukrainian case forms.
- Already-used prepared names are filtered out.
- Prepared names are saved as scribe-approved.
- Custom names show a warning before entry and reject exact duplicates plus a first set of creature/spirit/sacred or very famous names.
- A focused `scripts/test/character-names.cjs` regression covers prepared-name availability and forbidden custom names.

Remaining scope:

- Add a first creation choice:
  - `Обрати ім’я зі списку`;
  - `Ввести власне ім’я`.
- Move the prepared-name source from a small code-level list toward data or DB-backed content with explicit reservation state.
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

- A new player can pick a suitable prepared name without waiting for manual review. First slice exists in `0.12.11`; broaden the pool later.
- A custom-name player sees clear guidance before entering a name. First warning exists in `0.12.11`.
- Scribes still have authority over rare or uncertain custom names.
- Creature names such as `Вовк`, `Миша`, `Ведмідь`, `Лісовик`, `Упир`, `Ворон`, `Кіт` and `Сокіл` are rejected or routed away from ordinary personal-name approval.
- The flow preserves Ukrainian case forms and avoids exposing raw validation mechanics as the main experience.

## Later

- Reserved names for events and NPCs.
- Regional popularity and historical layers.
- Thematic generator and random pick from available names.
- Separate names, nicknames and public titles.
- Folk forms, diminutives and forms of address.
- NPC reactions to strange, foreign or ominous names.
