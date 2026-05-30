---
id: LOOP-003
title: Old campfire memory omen
status: testing
type: feature
area: core-loop
priority: medium
tags:
  - fire
  - light
  - omen
  - examine
  - atmosphere
depends_on:
  - HMYZ-001-D
  - FIRE-001-B
---

# LOOP-003: Old Campfire Memory Omen

## Goal

When a player relights or feeds an authored extinguished or ordinary campfire, the fire can reveal a small atmospheric trace of what happened here before.

## First Scope

- Use existing campfire, hmyz/twigs, torch and examine/look systems.
- Add 2-3 authored memory text variants.
- Make the reveal one-time or rate-limited per feature/location.
- Target ordinary/extinguished campfires, not magical campfires.
- Do not add a quest, fixed reward, ritual system or new crafting tree.

## Acceptance

- Feeding or relighting a suitable old campfire can reveal atmospheric memory text.
- The reveal does not spam on repeated actions.
- `/look` and `/examine` remain readable.
- Tests/build pass.

## First Slice

- Seeded old ordinary campfires can reveal one deterministic memory omen the first time they are fed or relit.
- The revealed memory is stored on the feature data and becomes visible in later campfire inspection text.
- Magical campfires and debug campfires do not use this omen path.
- Focused helper tests cover eligible old campfires, magic/debug exclusions, deterministic line selection and inspection text.
