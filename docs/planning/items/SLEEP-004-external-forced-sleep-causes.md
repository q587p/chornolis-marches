---
id: SLEEP-004
title: External forced sleep causes
status: icebox
type: feature
area: survival
priority: low
estimate: 4-8h
tags:
  - sleep
  - creatures
  - elixirs
  - rituals
  - danger
depends_on:
  - SLEEP-003
  - DREAM-001
---

# SLEEP-004: External forced sleep causes

## Goal

Eventually allow sleep to be caused by outside forces such as creatures, elixirs, traps, illness or rituals.

## Possible Scope

- A creature or spirit can induce ordinary sleep or pull a character into a lucid dream.
- A wrong elixir/food can cause long ordinary sleep.
- Allies nearby can wake the sleeper through direct social interaction.
- A character alone may sleep for a long in-world duration and wake to changed circumstances.
- Forced sleep may temporarily block manual `/wake` depending on the cause.

## Acceptance Direction

- Forced sleep uses the same sleep-state foundation instead of a one-off stun.
- The player gets atmospheric cause/effect text without hidden formulas.
- Nearby group members have meaningful wake/help options.
- The feature does not become generic crowd control before combat/social foundations are ready.

## Implementation Order

Keep in Icebox until ordinary sleep, dream separation, social wake actions and creature/effect systems are ready.
