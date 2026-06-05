---
id: LEARN-001-A
title: Minimal learning storage decision
status: done
type: design
area: learning
priority: high
estimate: 1h
tags:
  - learning
  - progression
  - schema
depends_on: []
---

# LEARN-001-A: Minimal learning storage decision

## Goal

Decide whether the MVP needs persistent skill storage now.

## First Scope

- Compare table vs JSON vs event-only prototype.
- Prefer the smallest persistent model only if needed.

## Acceptance

- Decision recorded.
- If table is needed, fields are specified.
- No premature broad skill sheet.

## Implementation Order

Can be done independently.

## 0.15.21 Foundation

Decision: use a minimal persistent `CharacterLearningProgress` table rather than
event-only storage. It records player, skill key, source key and context key
without defining the final skill tree or public skill sheet.

## Closure

Done in `0.15.21`.

Validation:

- `node scripts/test/learning.cjs`
- `node scripts/test/gathering-learning.cjs`
- `npm test`
- `npm run build`

Boundary: this closes only the minimal storage decision. It did not add a broad
skill sheet, final skill taxonomy or public raw-progress UI.
