---
id: QA-002
title: Camp and dream first-session smoke
status: testing
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
- Tutorial dream and repeatable `/help` learning text stay compact and diegetic rather than becoming a raw manual or public skill sheet.

## 0.16.31 Smoke Checklist

Use this as the lightweight manual pass after readiness and mentorship polish:

1. Start a fresh character and confirm onboarding enters the tutorial dream.
2. Use first `Озирнутися` and verify the dream teaches orientation without opening a full command manual.
3. Use first `Роздивитися` and verify closer attention reveals useful local detail.
4. Move through the dream path to the waking edge and finish or wake from the tutorial deliberately.
5. Confirm waking lands in the boundary camp anchor and still reads as a world scene, not a checklist.
6. Inspect the boundary marker, newcomer board, campfire and torch source.
7. Take or light a torch, then verify first-night guidance appears once when local light is missing and does not spam while local light is present.
8. Inspect `Майбутні уроки` in the tutorial dream and confirm it hints at чужий слід, наставник, гуртова дорога, настоянки and сутичка without slash-command/manual framing.
9. Open `/help` and confirm `Навчання й увага` mentions following, teacher attention, groups, tinctures and qualitative attack-learning awareness without raw numbers or public skill tables.
10. Confirm `/respawn` still points early/lost characters back toward the waking-world anchor.

## Validation

- `npm run planning:export`
- `node scripts/test/help.cjs`
- `node scripts/test/world-seed.mjs`
- `node scripts/test/tutorial-voices.cjs`
- `node scripts/test/world-time.cjs`
- `npm test`
- `npm run build`
