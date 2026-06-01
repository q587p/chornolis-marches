---
id: ONB-001-H
title: Hidden dream gate closing phrase reward
status: next
type: feature
area: onboarding
priority: medium
estimate: 1-2h
tags:
  - onboarding
  - tutorial
  - dream-gate
  - secret
  - reward
depends_on:
  - ONB-001
---

# ONB-001-H: Hidden Dream Gate Closing Phrase Reward

## Goal

Let attentive tutorial players discover that the dream gate can also listen to closing words.

This should remain a small secret, not an advertised tutorial step. The visible tutorial text should keep teaching the required opening phrase only.

## Scope

- Add `Закрийся` and close-like synonyms for the tutorial `Брама Сну`, routed through speech or a direct compatibility form such as `/close gate`.
- If the dream gate is currently open, close both sides of the passage early.
- If the player discovers this the first time, let Сон praise the player once and give one small useful reward.
- Keep the reward one-time per player.
- Possible reward candidates:
  - `шаг`, if coin/money items are already ready enough;
  - one small beginner-safe useful item if money is not ready.
- Do not add visible hints, button labels or tutorial instructions that reveal this secret.

## Non-Goals

- Generic close/lock mechanics for all gates.
- Publicly teaching `/close gate` in the beginner path.
- Repeatable farming through repeated open/close phrases.

## Acceptance

- Saying a close phrase near an open dream gate closes both dream-gate sides.
- Saying a close phrase near a closed dream gate gives a quiet already-closed response.
- The one-time praise/reward is recorded and cannot repeat.
- Existing opening flow remains unchanged and still uses `/say Відчинитися`.
- `/help`, tutorial hints and gate descriptions do not advertise the secret close phrase.
