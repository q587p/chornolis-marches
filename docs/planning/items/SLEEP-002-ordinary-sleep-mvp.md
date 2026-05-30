---
id: SLEEP-002
title: Ordinary sleep MVP
status: next
type: feature
area: survival
priority: high
estimate: 1-2h
tags:
  - sleep
  - wake
  - stamina
  - hp
  - tutorial
depends_on:
  - SLEEP-001
---

# SLEEP-002: Ordinary sleep MVP

## Goal

Make plain `/sleep` mean ordinary sleep: lie down, enter sleep state, recover more strongly than active rest and wake manually.

## First Scope

- Route plain `/sleep`, `спати` and `заснути` to ordinary sleep.
- Preserve `/sleep tutorial` as the tutorial dream command.
- Add `/wake` plus Ukrainian aliases `прокинутися` and `прокинутись`.
- Sleeping sets posture to `LYING` and a separate ordinary sleep state.
- Sleeping clears or blocks incompatible queued physical actions with clear text.
- Ordinary sleep restores Снага more strongly than active rest and can restore Життя slowly.
- Manual waking clears ordinary sleep but leaves posture as `LYING`, with actions to sit or stand.

## Acceptance

- `/sleep` no longer routes to the tutorial unless explicitly called as `/sleep tutorial`.
- `/sleep tutorial` still works for onboarding/tutorial behavior.
- A sleeping character cannot move, gather, pick up, attack, cook or handle fire/torch without waking/standing first.
- `/wake` wakes the character from ordinary sleep.
- Sleep recovery is visibly stronger than `/rest` but does not expose hidden balance numbers in player-facing text.
- Ordinary local chatter is not spammed to the sleeping player; direct wake/danger messages still reach them.
- Focused tests cover command routing, alias routing, sleep/wake state and posture guard behavior where cheap.

## Implementation Order

Do after `SLEEP-001`. Keep world-time auto-waking for `SLEEP-003`.
