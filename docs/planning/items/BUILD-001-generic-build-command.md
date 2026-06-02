---
id: BUILD-001
title: Generic build command foundation
status: backlog
type: feature
area: commands
priority: medium
estimate: 4-8h
tags:
  - commands
  - aliases
  - building
  - crafting
  - mud
depends_on:
  - CMD-001
---

# BUILD-001: Generic Build Command Foundation

## Goal

Turn the first campfire-specific build command into a reusable building command family.

The current `/build_campfire`, `build campfire`, `make fire`, `скласти вогнище` and `розкласти вогнище` path is intentionally narrow: it builds a small handmade campfire from carried `twigs` / `хмиз`.

Future construction should grow toward a generic command shape:

- `/build <thing>`;
- `build shelter`;
- `build gate`;
- `make campfire`;
- `побудувати шалаш`;
- `збудувати ворота`;
- `скласти вогнище`;
- other Ukrainian forms with common cases and word order variants.

## Scope

- Add a generic build intent that can parse a target object.
- Keep `/build_campfire` as a stable compatibility command and map it to the generic build intent internally.
- Add a small command registry or table for buildable targets, starting with campfire and future placeholders for shelter/gate.
- Route each buildable target to an existing or explicit action/service instead of duplicating logic in the parser.
- Keep Ukrainian aliases and English/MUD-style aliases together with slash forms.
- Make no-target `/build` reply with a compact usage hint rather than falling into unknown-command fallback.

## Guardrails

- Do not add full settlement construction in this task.
- Do not let `build` bypass material requirements, location restrictions, posture/sleep guards or action-queue pacing.
- Do not make every noun buildable just because the parser recognizes it.
- Keep button parity: any new building button must have a matching typed command path.
- Keep authored world features protected unless future data explicitly marks them as player-buildable or player-removable.

## Acceptance

- `/build_campfire`, `build campfire`, `make fire`, `скласти вогнище` and `розкласти вогнище` still build a handmade campfire through the same queued action as the button.
- `/build` without a target gives a useful short hint.
- Future targets can be added without a new parser branch for every object.
- Parser tests cover slash, slashless, English/MUD-style and Ukrainian aliases.
- Input-alias docs list the canonical shape and compatibility aliases.

## Notes

Near-term possible targets include a small shelter/шалаш and future gate/ворота work, but those should only ship when their material rules, location restrictions and ownership/decay behavior are designed.
