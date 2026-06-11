---
id: CMD-005
title: Generic use command router
status: backlog
type: feature
area: commands
priority: high
estimate: 2-4h
tags:
  - commands
  - aliases
  - inventory
  - usability
  - mud
depends_on:
  - CMD-001
---

# CMD-005: Generic Use Command Router

## Goal

Make `/use` and `використати` more universal without replacing the specific
commands that already exist.

The player should be able to type natural tool/object forms such as:

- `/use knife corpse`
- `use knife on corpse`
- `використати ніж на труп`
- `/use torch campfire`
- `використати факел на вогнище`
- `/use berries self`
- `використати ягоди на себе`

These should route to existing action semantics where there is an obvious,
implemented match:

- knife or suitable sharp weapon on a fresh corpse -> freshen/butcher corpse;
- unlit torch with a lit campfire or carried lit torch -> light torch;
- lit torch with a prepared/extinguished ordinary campfire -> light campfire;
- edible or healing inventory resource on self -> existing `USE_ITEM` behavior;
- future small pairs may be added only when they can reuse a real existing
  handler and a clear visible target.

## Direction

- Treat generic `/use` as an affordance router, not a new action system.
- Prefer reusing existing command handlers, action queue types and posture rules:
  `FRESHEN`, `USE_ITEM`, torch/campfire lighting, and later similarly small
  action pairs.
- Parse both compact slash forms and MUD-style text:
  - `/use_knife_corpse`
  - `/use knife corpse`
  - `use knife on corpse`
  - `use torch with campfire`
  - `використати ніж на труп`
  - `застосувати факел до вогнища`
  - `використати ягоди на себе`
- Preserve existing direct commands such as `/freshen`, `/light_campfire`,
  `light torch`, `eat berries` and `use herbs`.
- If several targets match, use the same visible-target clarification pattern as
  attack/freshen/inspect rather than guessing silently.
- If the object-target pair is not supported, reply with a useful diegetic
  refusal and suggest a known specific command when one exists.

## Guardrails

- Do not add a broad crafting, profession, economy or puzzle-combination system.
- Do not make `/use` bypass item possession, visibility, posture, stamina, light
  or action queue rules.
- Do not make every inventory item generically usable just because it exists.
- Do not expose raw internal ids in ordinary player text.
- Do not remove or deprecate specific commands; `/use` is convenience parity.
- Keep Ukrainian aliases and underscore slash forms in sync when examples appear
  in help, `/commands`, news or release notes.

## Acceptance

- Focused parser tests cover English, Ukrainian and underscore forms for the
  first supported pairs.
- Integration or handler tests prove each supported pair queues the same action
  as its specific command.
- Ambiguous corpse/feature/target matches ask for clarification instead of
  choosing a random target.
- Unsupported pairs give a helpful refusal rather than falling through to the
  unknown-command message.
- `/help` remains compact; `/commands` and `docs/systems/input_aliases.md`
  document only the implemented pairs.

## Notes

This is a future usability slice. It should not change live command routing in a
planning-only PR.
