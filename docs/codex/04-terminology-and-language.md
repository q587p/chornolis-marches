# 04 — Terminology and Language

## General Ukrainian style

Use Ukrainian as the default player-facing language unless the task says otherwise.

Preferred spelling/style for this project:

- `онбордінґ`
- `ґенерація`
- `мітологія`
- `паґінація`
- `паґінаційний`
- `етер`
- `Атени`
- use `ґ` where it naturally fits and supports the style.

This is not a universal hard rule for every Ukrainian word, but it is a strong style direction for Chornolis Marches.

## Fixed or preferred game terms

Canonical terminology source: `docs/design/terminology.md`.

| English / generic term | Preferred Ukrainian term | Notes |
|---|---|---|
| Look | **Озирнутися** | Main look/location action. |
| Location | **Місцина** | Prefer over direct “Локація” in player-facing UI where suitable. |
| Examine / inspect | **Роздивитися** / **Придивитися** | Choose by tone/context. |
| Stamina | **Снага** | Player-facing stamina/resource term; base stamina should be 42. |
| Rest | **Відпочити** | Means sit/rest briefly, not sleep. |
| Sleep | future sleep mode | Reserve bed iconography for this later feature. |
| HP | **Життя** / **Стан** | Avoid raw abbreviation in player-facing text. |
| Inventory | **Речі** / **Поклажа** | Prefer over direct “Інвентар” in player-facing UI. |

## Commands and UI labels mentioned

When adding or changing commands, keep aliases in sync:

- slash command where useful;
- English/MUD-style text aliases for future non-Telegram clients;
- Ukrainian text aliases for ordinary Telegram input;
- button labels and `/help` or `/adminHelp` documentation.

- `/look`
- `/examine`
- `/me`
- `/world`
- `/all`
- `/time`
- `/adminHelp`
- `/tick`
- `/restart`
- `/north`, `/south`, `/west`, `/east`
- `/n`, `/s`, `/w`, `/e`

`/look` is the player-facing command for **Озирнутися** / current location overview.
`/examine` is the player-facing command for **Роздивитися** / closer inspection.
Player-facing menus, help text and current docs should use `/look`. Legacy aliases for the location overview may remain in code for compatibility, but should not be advertised in current player-facing text.

Possible buttons/labels:

- **Місцина**
- **Озирнутися**
- **Роздивитися**
- **Придивитися**
- **Відпочити**
- **Час**
- **Авто**

## Name cases / grammar

The game has or should preserve support for Ukrainian name cases and pronouns in onboarding.

Compound names should also be declined:

- split name into words;
- decline each meaningful part;
- handle hyphenated parts separately;
- ignore particles like `де`, `фон`, `ван`, `аль`, `ібн`, `огли` where appropriate;
- prefer grammar-layer changes over DB schema changes unless necessary.

## Tone

Player-facing text should be:

- atmospheric but readable;
- Ukrainian-first;
- slightly archaic/folkloric where appropriate, but not incomprehensible;
- less “game menu”, more “world description”.

Avoid:

- sterile corporate wording;
- generic MMO phrasing;
- excessive raw numbers in normal UI;
- English terms when a good Ukrainian term exists.
