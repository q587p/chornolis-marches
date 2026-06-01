---
id: FOOD-005
title: Hunger consequences for health and stamina recovery
status: backlog
type: feature
area: survival
priority: medium
tags:
  - food
  - hunger
  - hp
  - stamina
  - survival
depends_on:
  - FOOD-001
  - FOOD-004
  - WORLD-003
---

# FOOD-005: Hunger consequences for health and stamina recovery

## Goal

Make hunger matter mechanically without turning it into a sudden punishment: severe hunger should slowly wear down health and make stamina recovery noticeably weaker.

## Problem

Hunger can already be eased through food, and `FOOD-004` tracks gentle cues that tell the player when it is time to eat. The next layer should give those cues real weight. If hunger changes only a status label, players can safely ignore it.

This should wait for `WORLD-003` or land alongside it, so penalties are based on deliberate world-time hunger pacing rather than rapid action-count spikes.

The effect should be slow, legible and recoverable:

- hunger makes rest less effective;
- severe hunger can chip away at health over time;
- eating should quickly make the situation feel better again.

## Scope

- Add hunger thresholds that affect recovery, not every tiny hunger value.
- Reduce stamina recovery while meaningfully hungry, roughly in the direction of a fourfold slowdown at severe hunger.
- Let severe hunger gradually damage health, at a much slower pace than exhaustion damage.
- Prefer modifying existing recovery/tick helpers over adding a separate notification loop.
- Keep ordinary player text qualitative: "голод заважає відновитися", not raw multipliers.
- Preserve `FOOD-004` as the cue layer; this task is the consequence layer.
- Avoid making new players collapse during the tutorial dream unless that tutorial branch explicitly teaches food and recovery.

## Design Notes

Possible first pass:

- light hunger: no mechanical penalty, only status/cue text;
- meaningful hunger: stamina recovery is slower;
- severe hunger: stamina recovery is much slower and occasional health loss can happen;
- eating moves the character out of the penalty tier immediately if hunger drops enough.

Exact thresholds and multipliers should be tuned against current `PLAYER_HUNGER_MAX`, existing passive/rest stamina intervals and health recovery intervals.

## Acceptance

- Hungry players recover stamina slower than non-hungry players.
- Severely hungry players can lose health slowly over time.
- Eating food reduces or removes the penalty as soon as hunger drops below the relevant threshold.
- Rest still helps while hungry, just less efficiently.
- The tutorial dream is protected from accidental starvation punishment unless explicitly teaching that moment.
- Player-facing text explains the state qualitatively.
- Tests cover no hunger, moderate hunger, severe hunger, eating out of the penalty, and tutorial protection.
