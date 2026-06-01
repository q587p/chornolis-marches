---
id: HMYZ-001-D
title: Add hmyz to campfire
status: testing
type: feature
area: survival
priority: high
estimate: 1-2h
tags:
  - hmyz
  - campfire
  - fuel
depends_on:
  - HMYZ-001-C
  - FIRE-001-B
---

# HMYZ-001-D: Add hmyz to campfire

## Goal

Use carried хмиз as first campfire fuel.

## First Scope

- Support `додати хмиз` / `підкинути хмиз`.
- Consume one or more хмиз.
- Extend active fire or prepare extinguished fire depending on current rules.

## Acceptance

- Хмиз is consumed.
- Campfire state changes visibly.
- Text is atmospheric.

## Implementation Order

Do after: `HMYZ-001-C`, `FIRE-001-B`.

## 0.14.23 Reconciliation Notes

- `Додати хмиз`, `додати хмиз` and `/add twigs campfire` consume carried `twigs`.
- Burning ordinary campfires can be extended, and extinguished ordinary campfires can be prepared for relighting.
