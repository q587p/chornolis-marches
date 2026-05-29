---
id: ONB-002-B
title: Expand forbidden-name normalization
status: next
type: feature
area: onboarding
priority: high
estimate: 1h
tags:
  - onboarding
  - names
  - validation
depends_on:
  - ONB-002-A
---

# ONB-002-B: Expand forbidden-name normalization

## Goal

Reject obvious creature, spirit, sacred or confusing names more consistently.

## First Scope

- Normalize whitespace, casing and apostrophe variants.
- Expand forbidden-name examples.
- Add regression cases.

## Acceptance

- Forbidden names are rejected after normalization.
- Tests cover at least 5 new variants.
- No valid prepared name is accidentally rejected.

## Out of Scope

- Do not implement broad fuzzy matching yet.

## Implementation Order

Do after: `ONB-002-A`.
