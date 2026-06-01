---
id: QA-002
title: Camp and dream first-session smoke
status: next
type: qa
area: onboarding
priority: medium
estimate: 1h
tags:
  - onboarding
  - camp
  - dream
  - qa
depends_on:
  - CAMP-001
  - ONB-001-B
  - ONB-001-C
  - ONB-004
---

# QA-002: Camp and Dream First-Session Smoke

## Goal

Keep a small manual smoke pass for the first session after darkness, starter-camp and tutorial-hint changes.

## Scope

- Fresh character onboarding into the tutorial dream.
- First `Озирнутися` and `Роздивитися` hints.
- Waking from the tutorial into `Межовий табір біля мосту`.
- Inspecting the boundary marker, newcomer board, campfire and torch source.
- Taking a torch from the camp source.
- Seeing the first-night guidance once in waking reduced visibility without local light.
- Confirming the same guidance does not appear in the tutorial dream or while local light is present.
- Watching whether first-night guidance feels noisy during the first dark hour, especially if the player repeats `look`/`examine` while learning light.
- Confirming the watchtower torch source is understandable as a temporary safety rail, while future limited-stock/container work remains separate.
- Testing the starter-camp path in actual darkness: a new player should be able to notice the watchtower, use `Вгору` / `up`, find the torch source and take a torch before leaving the camp.
- Trying the repeat-cooking button after raw meat is consumed; it should fail cleanly, not duplicate successful cooking output.

## Acceptance

- The first session still reads as a world, not a checklist.
- The player can infer where to return and why light matters.
- Repeating look/examine or moving through the camp does not spam duplicate teaching messages.
- `/respawn` still returns early characters to the same waking-world anchor.

## Validation

- `npm run planning:export`
- `node scripts/test/world-seed.mjs`
- `node scripts/test/tutorial-voices.cjs`
- `node scripts/test/world-time.cjs`
- `npm test`
- `npm run build`
