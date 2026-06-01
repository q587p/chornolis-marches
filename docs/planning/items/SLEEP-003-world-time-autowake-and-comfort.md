---
id: SLEEP-003
title: World-time auto-wake and sleep comfort
status: testing
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

## 0.14.13 First Slice

- Ordinary sleep now stores the world-clock minute when it begins.
- Recovery checks can auto-wake an ordinary sleeper after roughly eight in-world hours once HP and stamina reach the relevant local cap.
- Ordinary sleep has a hard upper bound of roughly ten in-world hours for the first slice, so it cannot continue forever if recovery is still incomplete.
- A shared sleep recovery profile now folds in local rest caps and active campfires: fire can raise the temporary stamina cap a little and improves sleep recovery.
- Manual `/wake` still works and clears the stored sleep-start minute.

## Follow-up Notes

- Location shelter/comfort metadata is still future work; the first slice uses existing rest-cap and active-campfire signals. Do not treat the current campfire modifier as the final shelter system.
- Danger interruption is still future work. Later safety work should decide how attacks, predator presence, loud events, direct wake/social actions and lucid dreams interrupt or reshape ordinary sleep.
- Scribe/admin `/timeSet` can shorten or lengthen ordinary sleep because sleep duration and auto-wake checks use internal world minutes. Treat that as an admin-only QA/live-ops risk: document it, avoid surprising live players when forcing time, and add a guard or explicit warning if time edits become common during active sessions.

## Implementation Order

Promote after `SLEEP-002`, `WORLD-001` and the first fire/light helper are stable.
