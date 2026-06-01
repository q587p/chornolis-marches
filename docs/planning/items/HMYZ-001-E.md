---
id: HMYZ-001-E
title: Hmyz observer messages
status: testing
type: ux
area: survival
priority: medium
estimate: 1h
tags:
  - hmyz
  - observer
  - local-events
depends_on:
  - HMYZ-001-D
---

# HMYZ-001-E: Hmyz observer messages

## Goal

Make visible хмиз actions readable to nearby characters.

## First Scope

- Notify local observers on pickup/add where appropriate.
- Use gender/number-aware text if available.

## Acceptance

- Nearby characters see a compact observer line.
- Actor does not receive duplicate spam.

## Implementation Order

Do after: `HMYZ-001-D`.

## 0.14.23 Reconciliation Notes

- Pickup and fire/fuel actions now use the same observer-message pattern as other visible local item actions where practical.
