---
id: FIRE-001-B
title: Expired campfire behavior polish
status: next
type: feature
area: survival
priority: medium
estimate: 1h
tags:
  - fire
  - campfire
  - copy
depends_on:
  - FIRE-001-A
---

# FIRE-001-B: Expired campfire behavior polish

## Goal

Expired campfires should remain inspectable but not bright.

## First Scope

- Ensure expired fires render as `Згасле вогнище`.
- Ensure they do not provide active light.
- Polish text.

## Acceptance

- Extinguished fire is visible/inspectable when appropriate.
- It does not reveal darkness as active light.

## Implementation Order

Do after: `FIRE-001-A`.
