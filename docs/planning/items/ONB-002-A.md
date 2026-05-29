---
id: ONB-002-A
title: Expand prepared-name pool
status: testing
type: feature
area: onboarding
priority: high
estimate: 1-2h
tags:
  - onboarding
  - names
  - ukrainian-grammar
depends_on: []
---

# ONB-002-A: Expand prepared-name pool

## Goal

Add more safe, scribe-approved prepared names for new characters.

## First Scope

- Add 5–10 prepared names.
- Include all required Ukrainian case forms.
- Include origin, rarity and grammatical/gender compatibility.

## Acceptance

- Prepared-name tests pass.
- Names do not duplicate existing prepared names.
- Prepared names are treated as already approved.

## Progress

- `0.13.0` expands the prepared-name pool by 9 names: 3 masculine, 3 feminine and 3 plural-form names.
- Tests now require at least 8 available masculine names, 8 available feminine names and 6 available plural-form names, and check duplicate prepared-name keys and nominative forms.

## Out of Scope

- Do not move prepared names to DB in this slice.

## Implementation Order

Can be done independently.
