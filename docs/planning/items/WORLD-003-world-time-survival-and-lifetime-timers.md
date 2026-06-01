---
id: WORLD-003
title: World-time survival and item lifetime timers
status: next
type: system
area: world_time
priority: high
tags:
  - world-time
  - survival
  - hunger
  - torches
  - campfires
  - decay
  - item-lifetime
depends_on:
  - WORLD-001-C
  - FOOD-004
  - WORLD-002
---

# WORLD-003: World-Time Survival and Item Lifetime Timers

## Goal

Move player survival pacing and temporary world objects toward the internal Chornolis world clock instead of scattered real-minute or action-count timers.

## Problem

Some first-pass systems still behave as if time is only a real-world interval or a side effect of individual actions. That can make hunger feel jumpy: a player who looks around, gathers, cooks or tests commands can become hungry far faster than the fiction suggests.

Now that the internal world clock exists, the next durable pass should make slow survival pressure and item lifetimes depend on in-game minutes, hours and days.

## Scope

- Add a player hunger timestamp or equivalent persisted state so hunger can rise gradually with world time.
- First target: roughly `+1` hunger per in-game hour, tuned after playtesting and protected in tutorial/dream cases where food is not the lesson.
- Keep strenuous actions as an extra pressure source, but do not make ordinary inspection/gathering feel like instant starvation.
- Migrate or audit temporary object timers against world time:
  - lit torches and dropped lit torches;
  - ordinary campfire burn time and extinguished campfire ash cleanup;
  - corpse freshness/decay and future visible remains;
  - raw/cooked meat spoilage;
  - ground resources/items that should rot, vanish or become hidden over time.
- Keep debug/scribe surfaces able to show exact internal minutes, while player-facing text stays qualitative.
- Document how `/timeSet` or future time jumps affect hunger, sleep, fire, torches and decay.

## Acceptance

- Player hunger changes predictably with internal world time, not with every ordinary stamina-spending action.
- Looking around, examining, gathering or cooking several times does not by itself create instant hunger spikes.
- Strenuous action and overexertion can still add pressure.
- Torches, campfires, corpses/remains and food lifetimes have an explicit world-time rule or an explicit exception note.
- Tests cover at least no elapsed hour, one elapsed hour, multiple elapsed hours, tutorial protection and time-set/backfill behavior.

## Notes

0.14.23 slows the immediate action-based hunger spike as a balance bridge. This task is the fuller persistence/time-model pass.
