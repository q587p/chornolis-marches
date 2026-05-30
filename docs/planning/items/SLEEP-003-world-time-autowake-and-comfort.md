---
id: SLEEP-003
title: World-time auto-wake and sleep comfort
status: backlog
type: feature
area: survival
priority: medium
estimate: 2-4h
tags:
  - sleep
  - world-time
  - campfire
  - comfort
  - recovery
depends_on:
  - SLEEP-002
  - WORLD-001
  - FIRE-001-A
---

# SLEEP-003: World-time auto-wake and sleep comfort

## Goal

Connect ordinary sleep to internal world time, campfires and location comfort.

## First Scope

- Track sleep duration in in-world hours once world time exists.
- Auto-wake after about 8 game hours if Життя and Снага are full or at the local temporary cap.
- Allow about 9-10 game hours when recovery is still incomplete.
- Let manual `/wake` still work unless a special forced-sleep rule applies.
- Active nearby campfires improve sleep recovery and may raise temporary Снага cap.
- Add or prepare location metadata for shelter/comfort instead of hardcoding every place.

## Acceptance

- Sleep no longer depends only on real-time/tick approximation once world-time helpers are ready.
- A rested character wakes automatically around 8 game hours.
- A badly hurt/exhausted character may sleep longer, but not forever.
- Campfire and comfort modifiers are applied through a shared helper or service.
- Unsafe/no-comfort places do not become infinite free healing.
- Player-facing text stays atmospheric and avoids exact hidden formulas.

## Implementation Order

Promote after `SLEEP-002`, `WORLD-001` and the first fire/light helper are stable.
