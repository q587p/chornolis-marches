---
id: ONB-006
title: Look/examine semantics in the dream
status: next
type: ux
area: onboarding
priority: high
estimate: 1-2h
tags:
  - tutorial
  - look
  - examine
  - ux
  - copy
depends_on:
  - ONB-001-B
  - ONB-001-C
---

# ONB-006: Look/Examine Semantics in the Dream

## Goal

Make the difference between `Озирнутися` / `/look` and `Роздивитися` / `/examine` obvious through action results, not a dictionary explanation.

## Current State After 0.14.8

- ONB-001-B and ONB-001-C add one-time Сон/Дрімота hints after first tutorial look and examine.
- The next step should add a concrete dream feature or optional room where the two commands visibly reveal different layers of the same thing.

## First Scope

- Add a dream feature or room where `/look` gives orientation but not the useful detail.
- Add `/examine` result that reveals a concrete next action or hidden detail.
- Keep copy very short.
- Do not make the lesson required to complete the tutorial.

## Acceptance

- A player can infer that look = orientation and examine = focused attention.
- `look <feature>` and `examine <feature>` do not produce identical output for the lesson target.
- The lesson is optional and does not strand the tutorial completion surface.
- Existing tutorial foraging and fox observation still work.

## Validation

- `node scripts/test/tutorial-voices.cjs`
- `node scripts/test/tutorial-foraging.cjs`
- `npm test`
- `npm run build`
