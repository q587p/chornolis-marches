---
id: FIRE-002
title: Target-aware campfire commands
status: backlog
type: feature
area: survival
priority: high
estimate: 2-4h
tags:
  - fire
  - campfire
  - commands
  - aliases
  - targets
depends_on:
  - WORLD-002
  - BUILD-001
---

# FIRE-002: Target-Aware Campfire Commands

## Goal

Let text commands address a specific nearby handmade campfire when several suitable fires are present in one location.

The current no-target commands are useful but intentionally rough:

- `/light_campfire`;
- `/douse_campfire`;
- `/dismantle_campfire`.

They pick the first suitable nearby handmade campfire. That is acceptable for a first command-parity slice, but it becomes ambiguous once several player-made campfires exist in the same location.

## Scope

- Add target-aware forms for lighting, dousing and dismantling handmade campfires.
- Support compact slash payloads such as:
  - `/light_campfire_1`;
  - `/light_campfire_2`;
  - `/douse_campfire_1`;
  - `/dismantle_campfire_3`.
- Support slashless and Ukrainian text forms where practical:
  - `light campfire 1`;
  - `douse campfire 2`;
  - `dismantle campfire 3`;
  - `підпалити вогнище 1`;
  - `погасити друге вогнище`;
  - `розібрати вогнище 3`.
- Reuse the visible feature/target ordering that the player sees in location detail buttons where practical.
- Keep no-target commands as convenience fallback when exactly one suitable nearby campfire exists.
- If several suitable campfires exist and no target is provided, ask for clarification instead of silently choosing the first one.
- While touching campfire command/UI targeting, consider making the inventory `Скласти вогнище` button location-aware. The current MVP only checks carried `twigs`, so it may appear in a місцина that is already at the handmade-campfire cap; the callback then rejects correctly.

## Guardrails

- Do not let target suffixes bypass visibility, ownership/type, campfire state or posture/action-queue checks.
- Do not allow dismantling seeded/old authored campfires unless future data explicitly marks them player-removable.
- Do not expose raw database ids in player-facing text.
- Keep button behavior unchanged; precise feature buttons should keep targeting their selected campfire.
- Keep Ukrainian aliases and English/MUD-style aliases together with the slash forms.

## Acceptance

- `/light_campfire_1`, `/douse_campfire_1` and `/dismantle_campfire_1` resolve the first visible eligible handmade campfire in the current location.
- Numbered text aliases resolve the same visible ordering as the buttons or target list.
- Ambiguous no-target commands ask the player which campfire they mean when more than one eligible campfire is present.
- Invalid or stale targets fail visibly without queueing the wrong action.
- Parser tests cover numbered slash commands, English/MUD-style forms and Ukrainian forms.
- Action/service tests cover the "multiple campfires nearby" case.

## Notes

This is a near-future follow-up to the 0.15.8 campfire command-parity slice. It should land before player-made campfires become common enough that multiple handmade fires in one location are ordinary.

Also keep the 0.15.7 rollback caveat in mind: PostgreSQL enum values added for campfire actions should usually be left unused during rollback rather than removed casually, unless a deliberate enum-rebuild migration is prepared.
