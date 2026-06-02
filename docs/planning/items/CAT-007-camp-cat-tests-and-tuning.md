---
id: CAT-007
title: Camp cat tests and tuning pass
status: next
type: chore
area: testing
priority: medium
tags:
  - cat
  - tests
  - tuning
  - ecology
  - social
---

# CAT-007 — Tests and tuning

## Summary

Add focused regression coverage and first-pass tuning for the camp spirit cat behavior loop.

## Scope

- Add `scripts/test/camp-cat.cjs` or integrate into existing creature/social tests.
- Cover foundation, no ordinary death, camp boundary, vertical flee, mouse priority, meat scene, feed/shoo and ambient copy.
- Verify the feature does not require a Prisma migration unless intentionally added.
- Keep the behavior budget safe under creature tick processing.
- Tune cooldowns and priorities from basic deterministic tests.

## 0.15.10 Test Notes

The focused `scripts/test/camp-cat.cjs` coverage now includes:

- deterministic pounce/watch planning for local mouse pressure;
- representative contextual full-examination lines for mice, night/fire and the watchtower;
- cat-specific predator observer copy for miss, wound and kill outcomes.

Longer simulation tuning, feed/shoo behavior and raw-meat give tests remain future work.

## Out of scope

- Long-running simulation balancing.
- Production telemetry dashboard.
- Full companion QA.

## Acceptance criteria

- New focused tests pass locally.
- Existing `npm test` and `npm run build` pass.
- Camp cat does not add noisy world tick load.
- Copy does not leak English/internal labels.
- Boundary and priority tests are deterministic.

## Suggested validation

- `node scripts/test/camp-cat.cjs`.
- `node scripts/test/creature-tick-budget.cjs` if tick selection changes.
- `npm test`.
- `npm run build`.
- `git diff --check`.
