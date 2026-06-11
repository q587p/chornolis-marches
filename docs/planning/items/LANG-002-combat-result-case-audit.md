---
id: LANG-002
title: Combat result case audit
status: backlog
type: chore
area: content
priority: high
estimate: 1-2h
tags:
  - ukrainian
  - grammar
  - combat
  - creatures
  - text
depends_on:
  - LANG-001
---

# LANG-002: Combat Result Case Audit

## Goal

Fix combat and action-result templates that mix the target accusative form into a nominative sentence.

Observed bug:

> ⚔️ Ви б’єте коротким мечем. Жабу падає, і труп лишається на землі.

The second sentence needs nominative subject agreement: `Жаба падає`, not `Жабу падає`.

## Scope

- Audit attack/kill/freshening/predator result text where the same target label is reused across:
  - direct object phrases;
  - sentence-start subject phrases;
  - corpse/remains descriptions;
  - observer messages.
- Use lexicon/grammar helpers where available:
  - accusative for “ви б’єте кого/що”;
  - nominative for “хто падає/тікає/зникає”;
  - genitive where a corpse/remains phrase needs it.
- Cover animals and other creatures, not only frogs.
- Keep player-facing text qualitative and atmospheric; do not expose combat math.

## Guardrails

- No combat rule changes, damage tuning, rewards, loot changes, queue changes, Prisma schema or migration.
- Do not rewrite the whole grammar layer if a focused helper/test can fix the visible bug.
- Keep broader lexicon cleanup under `LANG-001`; this item is for result-template case correctness.

## Acceptance

- The frog attack result reads `Жаба падає...`.
- Focused tests cover at least:
  - feminine animal, e.g. frog/snake/mouse if applicable;
  - masculine animal, e.g. rabbit/hawk/wolf/fox where relevant;
  - an observer or corpse phrase if it uses the same helper.
- Search/audit does not find the same accusative-as-subject pattern in adjacent combat result templates.
- Existing attack, predator feeding, freshening and corpse tests still pass.
