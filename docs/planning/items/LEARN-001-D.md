---
id: LEARN-001-D
title: Raw progress technical-only
status: done
type: ux
area: learning
priority: high
estimate: 1-2h
tags:
  - learning
  - technical-details
  - ui
depends_on:
  - LEARN-001-C
---

# LEARN-001-D: Raw progress technical-only

## Goal

Avoid exposing a broad public skill sheet too early.

## First Scope

- Show raw progress only in scribe/admin technical details if needed.
- Ordinary player text stays diegetic.

## Acceptance

- Players see “you understand better” style text.
- Raw numbers are hidden from ordinary UI.

## Implementation Order

Do after: `LEARN-001-C`.

## 0.15.21 Foundation

No broad `/skills` UI was added. Ordinary players still see only diegetic
learning messages from existing narrow moments; raw progress rows are reserved
for future technical/scribe surfaces if needed.

## Closure

Done in `0.15.21`, with later surface hardening in `0.15.40` and `0.15.44`.

Validation:

- `node scripts/test/learning.cjs`
- `node scripts/test/admin-learning-summary.cjs`
- `npm test`
- `npm run build`

Boundary: raw progress remains technical-only. This does not close future polish
around how much qualitative `Навички:` text ordinary target inspection should
show in live play.
