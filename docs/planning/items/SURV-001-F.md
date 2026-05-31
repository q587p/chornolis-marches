---
id: SURV-001-F
title: Beginner return command-menu eligibility
status: backlog
type: polish
area: survival
priority: medium
estimate: 1-2h
tags:
  - respawn
  - telegram
  - balance
  - beginner
depends_on:
  - SURV-001-E
---

# SURV-001-F: Beginner Return Command-Menu Eligibility

## Goal

Make `Повернення` (`/respawn`) appear in Telegram side command menus only while it is still relevant.

The command itself can remain accepted when typed directly, so older clients, help text and direct player intent do not break. The menu should stop advertising it once a character is no longer an early/lost/weak character by the current eligibility rules.

## Context

`/respawn` is currently near the top of the public Telegram command menu as a beginner safety valve.

After the first live play period, this may become misleading for established characters: the side menu can still suggest `Повернення`, while the command refuses because the character has already grown too anchored in the world.

## Scope

- Check whether the Telegram side command menu can be synced per chat/player with current `beginnerReturnEligibility`.
- Hide or demote `/respawn` for established characters who no longer pass the rules.
- Keep `/respawn` visible for:
  - fresh characters inside the real-time grace window;
  - weak characters who can still use it;
  - characters who are not yet clearly established.
- Keep direct typed `/respawn` and Ukrainian aliases working, with the existing refusal text when ineligible.
- Update `scripts/test/telegram-commands.cjs` or add a focused helper test for eligible vs ineligible command-menu sets.

## Balance Calibration

Before changing the progress threshold, inspect real player stats, excluding NPCs/creatures:

- steps;
- looks;
- successful gathers;
- kills;
- rest starts;
- character age in real time.

Use at least a rough median/high-percentile view of current player progress. The current numeric threshold may be too low for live play; consider raising it or replacing it with a clearer rule such as grace-window plus weak-state plus discovered-area/tutorial-completion gates.

## Acceptance

- Eligible beginner/weak characters still see `Повернення` (`/respawn`) in the side command menu.
- Clearly established characters do not keep seeing `/respawn` as a suggested side-menu command.
- Direct `/respawn` still works and gives the correct prompt or refusal.
- Tests cover eligible and ineligible command-menu behavior.

## Out of Scope

- Full death respawn.
- Map-wide teleport or fast travel.
- Player death/knockout rules.
- A complete replacement for beginner-return eligibility.
