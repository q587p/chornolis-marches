---
id: ADM-001
status: backlog
area: admin
tags:
  - admin
  - permissions
  - reset
  - moderation
  - names
priority: high
depends_on: []
---

# Admin permissions, moderation and restricted reset

`/adminHelp`, `/reset`, name approval and dangerous debug/moderation commands need to stay behind a scribe/admin gate before public testing grows.

## Goal

Add a proper admin rights and moderation layer before public testing grows.

## Notes

- 0.11.6 first pass: added a `Player.role` database role with `SCRIBE`, kept `ADMIN_TELEGRAM_IDS` as an emergency/operator path, and added hidden `/adminSet <secret>` using `ADMIN_SET_SECRET` to grant the current player `Писар Порубіжжя` access.
- `/adminHelp`, `/reset`, `/addCampfire`, `/addTorch`, `/addTwigs`, creature debug commands, runtime tick commands and other technical views now require scribe/admin access.
- Log who ran `/reset` and when.
- Consider confirmation before destructive admin actions.
- `restart` without `/` now follows the command parity rule. Treat it as a destructive command surface: it should share the `/restart` confirmation flow rather than deleting character state immediately.
- Feature fields rendered into HTML are a safety surface too. Names, descriptions and data-derived hints should be escaped before being placed into Telegram HTML output.

## Name Approval Flow

Near-term scribe flow for custom character names:

- Add a scribe-only list command/view, likely `/all character`, that shows characters needing name review and supports pagination.
- From that list, let scribes open a character's service profile.
- In the profile, show inline buttons such as `Схвалити ім’я` and `Не схвалити ім’я`.
- `Схвалити ім’я` sets the current name/case forms as approved and records which scribe approved it.
- `Не схвалити ім’я` should let the scribe write a short message to the character explaining what needs to change.
- The player-facing character card should keep the current tone: `Ім’я схвалене.` or `Ім’я ще не схвалене. Зверніться до писарів Порубіжжя.`
- Future refinements can include filters by pending/approved/rejected, review history, and direct edit suggestions for Ukrainian cases.

## Future Moderation Actions

After the basic scribe/name flow is stable, add MUD-like moderation tools:

- `mute` / silence: temporarily limit speech or loud channels while preserving core movement/gameplay.
- `ban`: block abusive access at the account/Telegram identity layer once account protection exists.
- jail / holding place: move a character to an in-world detention location with clear rules and logs.
- warning / note: record a scribe note visible in service profiles without immediately punishing the character.

All moderation actions should be logged, scoped by role, and ideally have undo/review paths. They should feel like tools of the frontier administration, not arbitrary hidden magic.
