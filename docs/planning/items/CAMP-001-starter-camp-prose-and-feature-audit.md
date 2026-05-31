---
id: CAMP-001
title: Starter camp prose and feature audit
status: done
type: content
area: core-loop
priority: high
estimate: 1-2h
tags:
  - camp
  - onboarding
  - mud
  - look
  - examine
depends_on:
  - LOOP-001-A
---

# CAMP-001: Starter Camp Prose and Feature Audit

## Goal

Make `Межовий табір біля мосту` read as the real-world anchor of the game: a shared border camp, not only the cell where `/respawn` lands.

## 0.14.8 Scope

- Updated `start_border_camp` prose so it communicates:
  - the old bridge and closed gate east;
  - meadow / forest edge west;
  - riverbank north and south;
  - safety, fire and return-anchor role;
  - visible human maintenance and shared use.
- Added a direct inspectable `Дошка для прибулих` feature with compact advice.
- Added a beginner `Смоляна поставка з факелами` feature at the camp so players can find light before leaving in dusk/night.
- Kept `start_border_camp` as the configured start location and `/respawn` anchor.

## Deferred

- A real watchtower room, shared supply cache and hidden restock rules remain separate work.
- Hunter routes are not changed in this slice; the existing gate torch source remains available until the watchtower/source route pass can update all assumptions together.

## Acceptance

- The camp description gives orientation without a lore wall.
- Existing camp features have useful direct inspection copy.
- The player can understand that the camp is shared and maintained by others.
- The copy remains compact enough for Telegram.
- No new economy/settlement systems are pulled into this slice.

## Validation

- `node scripts/test/world-seed.mjs`
- `npm test`
- `npm run build`
