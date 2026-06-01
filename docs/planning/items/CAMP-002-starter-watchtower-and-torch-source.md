---
id: CAMP-002
title: Starter watchtower and camp torch-source route update
status: testing
type: feature
area: core-loop
priority: high
estimate: 2-4h
tags:
  - camp
  - map
  - torch
  - light
  - mud
  - vertical-exits
depends_on:
  - CAMP-001
  - FIRE-001-C
---

# CAMP-002: Starter Watchtower and Camp Torch-Source Route Update

## Goal

Add a real watchtower room above the starter camp and make beginner light sourcing live there cleanly without breaking hunter route assumptions.

## Current State After 0.14.8

- `start_border_camp` already has a beginner-facing `Смоляна поставка з факелами`.
- `closed_east_gate` still keeps its torch source so existing hunter routes and gate-side behavior do not change in the camp-prose slice.

## First Scope

- Add `start_border_watchtower` as a real location above the camp.
- Add `UP` / `DOWN` exits:
  - camp → tower;
  - tower → camp.
- Add a `Сторожова вежа` feature in the camp.
- Decide whether the camp torch source stays at ground level, moves to the tower, or is mirrored with clear copy.
- Remove, demote or reword the old gate torch source only when hunter/NPC route assumptions are updated in the same PR or an adjacent PR.
- Keep the tower safe and small; it is a viewpoint and light-source room, not a new settlement layer.

## Acceptance

- `up` / `вгору` from camp moves to the watchtower.
- `down` / `вниз` from watchtower returns to the camp.
- `look` from the tower gives useful orientation.
- `examine torch stand` explains torch-taking and light.
- Hunter route assumptions are updated or explicitly kept compatible.
- Seed tests pass.

## 0.14.9 Slice

- Added `start_border_watchtower` as a real `z = 1` location above `start_border_camp`.
- Added visible `UP` / `DOWN` exits between the camp and the watchtower.
- Added an inspectable `Сторожова вежа` feature in the camp to point toward vertical movement.
- Moved the beginner `Смоляна поставка з факелами` from the camp floor to the watchtower, keeping it as a torch source.
- Kept `closed_gate_torch_stand` unchanged until hunter routes and gate-side assumptions are audited together.

## 0.14.10 Slice

- Hunter resupply no longer assumes the old gate torch stand.
- The watchtower `start_camp_torch_stand` is now the hunter torch source as well as the beginner-light source.
- The old gate stand remains available but is marked as downgraded/not the hunter resupply source, so hunter routes can be audited separately from player emergency light.
- Inspecting the camp `Сторожова вежа` feature now offers a direct `Вгору` button through its authored `vertical_hint`.
- `вверх` is accepted as an additional text alias for upward movement.

## Validation

- `node scripts/test/world-seed.mjs`
- `node scripts/test/route-finding.cjs`
- `npm test`
- `npm run build`
