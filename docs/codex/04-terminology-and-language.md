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
- money display should use `ґривня`, `ґривні`, `ґривень` for the `grivna` resource; keep the `ґ` spelling in Chornolis copy.
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
| Sleep | **Сон** / **Спати** | Plain `/sleep` is ordinary sleep; use `/sleep tutorial` for the tutorial dream. |
| Lie down | **Лягти** | Changes posture only; it does not start sleep or rest. |
| HP | **Життя** / **Стан** | Avoid raw abbreviation in player-facing text. |
| Inventory | **Речі** / **Поклажа** | Prefer over direct “Інвентар” in player-facing UI. |
| Auto mode | **Поклик духа** | Player-facing name for the simple automatic-action helper. Keep `auto` for internal notes, DB/log identifiers and legacy command compatibility. Do not use **Провід** for this feature. |
| Follow assist | **Слідова підмога** | Player-facing name for the opt-in helper that can repeat a visible followed step. Keep `followAssist` / `follow_assist` for code, commands and ops labels; avoid **Автокрок**, **Автоспроба** and similar auto-technical labels in player-facing copy. |

## Commands and UI labels mentioned

When adding or changing commands, keep aliases in sync:

- slash command where useful;
- English/MUD-style text aliases for future non-Telegram clients;
- Ukrainian text aliases for ordinary Telegram input;
- button labels and `/help`, `/adminHelp` or `/adminMenu` surfaces.

With rare exceptions, new player-facing in-world action buttons should not be callback-only. Add a stable slash command, an English/MUD-style form, and Ukrainian aliases with common cases/forms where practical. Callback-only behavior is acceptable for now for pagination, archive navigation, confirmation/cancel controls, and other purely navigational UI. Where practical, those UI/navigation surfaces should also gain typed commands later, but that is follow-up polish rather than a blocker for ordinary action parity.

Direct slash commands should also accept the same direct text form without the leading slash when practical, especially for scribe/admin commands: `/teleport forest_07_00` and `teleport forest_07_00` should behave the same.

If a slash command has a no-argument usage hint, its English/MUD-style and Ukrainian aliases should route to that same hint too. For example `/yell`, `yell`, `call` and `гукнути` without text should all explain how to add the message text, not fall into the generic unknown-command response.

When a player-facing slash command example includes spaces or arguments, keep the Telegram-clickable underscore form working as the same input. Examples: `/attack_all_mouse` -> `/attack all mouse`, `/sleep_tutorial` -> `/sleep tutorial`, `/queue_cancel` -> `/queue cancel`. Document any exception explicitly instead of relying on players to guess.

Actual Telegram keyboard button labels should stay short and clean: Ukrainian label plus icon where helpful. Use slash commands in parentheses in help, commands, news, release notes and docs, but do not append `(/command)` hints inside reply or inline keyboard button text. In `news.md`, prefer naming the working command beside each player-facing action, for example `Речі` (`/inv`) or `Підпалити вогнище` (`/light_campfire`), so missing aliases are caught before publication.

Short usage prompts like `Напиши так:` or `Напишіть так:` should visually emphasize the command verb with Telegram HTML italics. Example: `Напишіть так: <i>give</i> сире м'ясо коту або <i>дати</i> сире м'ясо коту.` Keep the example readable and do not italicize the whole sentence.

Player-facing direct speech from characters, creatures, spirits, dreams or tutorial voices should render as Telegram quote blocks (`<blockquote>...</blockquote>`) through service/renderer helpers, not as bare inline quoted prose. Keep raw HTML out of authored world JSON; add quote markup at the rendering/service boundary.

- `/look`
- `/examine`
- `/me`
- `/world`
- `/all`
- `/time`
- `/calendar`
- `/adminHelp`
- `/adminMenu`
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
- **Поклик духа**

## Name cases / grammar

The game has or should preserve support for Ukrainian name cases and pronouns in onboarding.

Stable world nouns should live in `src/content/lexicon/worldLexicon.ts`: creature species, NPC profession labels, spirits, resources, location features and common nouns that appear in gameplay text. Add full case forms there when a noun becomes part of stable world data.

The grammar layer in `src/services/grammar.ts` should contain shared mechanics for using those forms: case lookup, fallback guessing for names or text that is not yet in the lexicon, actor grammatical gender, and small agreement helpers such as choosing a past-tense verb form. Do not treat that fallback as a reason to skip lexicon forms for persisted species, seeded NPC/profession labels, recurring resources or other nouns used in templates.

Avoid adding parallel Ukrainian grammar helpers under `src/utils/` when the rule is shared by gameplay text. If two surfaces need the same case, gender or verb-agreement logic, put it in `grammar.ts` or a deliberate grammar submodule and document the boundary in `docs/content/world-lexicon.md`.

Known cleanup state: the lexicon does not yet remove every nominative insertion from older text paths. When editing nearby code, prefer `creatureForms`, `speciesForms`, `playerForms` or lexicon-backed helpers, but keep broad replacement passes focused and testable.

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
