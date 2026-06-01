# 08 — Prior Version / Update Notes

This is not a complete changelog. It preserves remembered context from past patch/update discussions.

## 0.6.x context

- At one point `main` / `package.json` were around `0.6.0`.
- `/restart` was framed as `0.6.1` without a new Prisma migration.
- `/restart` should delete the character and its work, then reset onboarding from zero.
- `start.ts` already had onboarding with pronouns and cases.

## 0.7.2 supplement context

Remembered archive/update direction:

- no separate `Починаємо...` message;
- `rest:interrupt`, `rest:queue`, `rest:queue-rest` edit current message;
- direction commands `/north /south /west /east` plus `/n /s /w /e`;
- direction buttons use command-style flow;
- `Скасувати поточну` and `Очистити чергу` also cancel active rest;
- `/me` shows passive/active recovery time;
- `/gather` without args gathers random available material;
- `/gather herbs|berries|mushrooms` remain exact;
- gather cost unified to `5` stamina = `65 с` in that discussion.

## 0.7.4 context

Main remembered rule from this period:

- a build issue was mentioned in `src/services/actionQueue.ts` related to missing imports at the top of the file.

## 0.7.5 / 0.7.6 direction

User wanted a unified time system:

- world time;
- auto mode;
- actions;
- animals/NPCs;
- runtime tick updates without restart.

## 0.8.1 / liminal skills pack direction

Planned/previous archive idea included:

- update `ROADMAP.md`;
- update `GAME_DESIGN.md`;
- add `docs/systems/progression.md`;
- include liminality and skill growth through use/observation;
- possibly include changelog/news snippets if requested.

## 0.8.3 direction

Planning/documentation memory:

- `docs/planning/icebox.md` as cold storage;
- `items/`, `decisions/`, `exports/` concepts;
- user later preferred ready files instead of patch files.

## 0.9.2 / 0.9.3 context

Remembered current-ish project state around late May 2026:

- `/adminHelp` should keep full command list visible;
- `/tick` should report animals/NPC/actions summary;
- `🪧 Межовий знак` and other location buttons should be visible immediately in Location;
- `Авто` should be in character/game flow, not a detached menu;
- auto-state should persist across updates but reset on `/reset`.

## 0.11.x context

Important remembered direction from the 0.11 line:

- `docs/design/terminology.md` is the canonical Ukrainian terminology source.
- `/look` is the player-facing **Озирнутися** / current місцина overview; `/examine` is **Роздивитися** / closer inspection. Legacy location-overview aliases may remain in code, but menus should prefer `/look`.
- `/start` should not teleport an existing character to the beginning. It should refresh greeting/menu state and continue from the current місцина.
- Player-facing UI should avoid raw `HP`, `Stamina`, `Inventory` and `Location`; prefer `Життя` / `Стан`, `Снага`, `Речі` / `Поклажа`, and `Місцина`.
- Ordinary UI should hide exact technical numbers unless the current character is a scribe/admin with local technical details enabled.
- `/chat` has time, location and character grouping modes; web chat should stay aligned with Telegram chat views.
- Scribe/admin surfaces include fuller `/playerAdmin` cards, visible NPC detail cards from `/all`, `/teleport`, `/addCampfire`, `/addTorch`, `/addTwigs`, `/debugGet` and `/debugSet`. Keep `/adminHelp` complete when adding admin commands.

## 0.12.x context

- `Дрімотна Межа` is the first dream tutorial region and intentionally lives on `z = -13`.
- New characters enter the dream after onboarding; existing `/start` refresh behavior still must not teleport existing characters.
- `/sleep tutorial` returns to the saved tutorial dream position. Since `0.14.12`, plain `/sleep` is ordinary sleep in the current waking location; do not route it to the tutorial unless the player explicitly asks for the tutorial dream.
- `Прокинутися` / `/wake` exits the tutorial dream, stores the dream position and restores a valid real-world location.
- `/tutorialReset [character]` is a scribe/admin command that clears the completed tutorial marker and makes the tutorial start location the saved dream location for the next `/sleep tutorial`.
- A player's own `/me` view should say when they have not yet completed the tutorial dream.
- Visible locked exits are now reusable: locked directions appear in exit lists in parentheses, movement gives a blocked reason, and queued movement re-checks the lock before completion.
- `Брама Сну` uses the locked-exit flow and now teaches speech: `/say Відчинитися` / `Сказати «Відчинитися»` opens the south exit for a cycling 30s, 1m, 2m, 4m, 8m window, then back to 30s; `/open` / `Відкрити` may remain as compatibility aliases, but tutorial UI should prefer the speech path.
- Slow tutorial pace comments should draw from a varied Сон/Дрімота pool and use the same cycling reminder rhythm.
- Inventory now has first modest item actions: berries restore a small amount of stamina and ease hunger by a tiny amount, mushrooms ease hunger, herbs can restore a small amount of HP when wounded, dry torches can be lit when fire is available, and resource stacks can be inspected or dropped. Keep later item-use work diegetic and modest until cooking, medicine, herbalism and real item instances exist.
- Immediate pickup/drop item actions should be room-visible, recorded as world events, and visible in scribe/admin recent-action history.
- Carried and dropped lit torches burn out into `хмиз`, not dry torches. Dropped lit torches remain visible under `Лежить`, can light the location and can be picked up before burn-out. Inspecting another character shows visible lit torches in hand(s) or `Руки порожні.` only when no obvious held item is visible.
- `Додати хмиз` / `/add twigs campfire` is implemented as the first `twigs` fuel loop: `twigs` can extend burning ordinary campfires or prepare extinguished ordinary campfires for relighting. Broader foraging, richer fuel types and player-made campfires remain future work.
- Onboarding, `/help`, fallback hints and tutorial/newcomer-helper plans should be reviewed whenever early-game actions, resources, visibility or survival mechanics change.

## 0.13.x context

- The 0.13 lane starts the Core Loop & Onboarding Stability slice.
- `0.13.0` expands the prepared character-name pool while keeping it in the typed data module. Prepared names remain scribe-approved by default and must include all Ukrainian case forms, origin, rarity and grammatical/gender compatibility.
- Character-name tests should guard prepared-name coverage, duplicate keys and duplicate nominative forms.
- `0.13.1` tightens forbidden custom-name normalization: obvious creature, spirit, sacred, famous or common-word names should be rejected even when players vary case, apostrophes, internal spaces or hyphens.
- `0.13.6` separates player posture from active rest. `сісти` / `/sit` means sitting without recovery, `/stand` / `встати` stands up, and `/rest` starts recovery while sitting. Rest completion or interruption leaves the character sitting; standing during rest interrupts it.
- `0.13.7` starts the gate hunting loop as ecological pressure, not a quest. The closed settlement gate now has a notice and `Падальний рів`; narrow `/put` can place carried carcasses/remains into the drop-off and record contribution reactions. NPC hunter behavior remains the next slice and should use the same drop-off service.
- `0.13.19` starts with release process discipline: use a separate `codex/` branch, open a PR into `main`, and include concise summary, validation and risk/rollback notes in the PR description.
- `0.13.19` also promotes session presence into the MVP: `SES-001-A/B/C` should add AFK / End Session controls, silent Auto-AFK after player inactivity, a one-idle-reminder-per-scene cap, send-time guards for delayed/proactive messages while a player is away, and focused tests/manual QA notes. Atmospheric labels, social visibility, notification preferences and richer return recaps remain `SES-002` backlog.

## Prior build issue note

A prior build error cause:

- `src/handlers/start.ts` imported `renderCurrentWorldYearLine` from `../services/calendar`;
- `calendar.ts` exported `formatCurrentWorldYear()` instead;
- suggested fix: add alias `renderCurrentWorldYearLine()` returning `${formatCurrentWorldYear()}.`

Verify current repo before applying this.
