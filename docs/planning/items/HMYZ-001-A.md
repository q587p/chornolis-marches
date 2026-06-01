---
id: HMYZ-001-A
title: Audit hmyz model
status: testing
type: technical
area: survival
priority: high
estimate: 1h
tags:
  - hmyz
  - resources
  - inventory
depends_on:
  - FIRE-001-A
---

# HMYZ-001-A: Audit hmyz model

## Goal

Identify current хмиз representation before expanding it.

## First Scope

- Check whether хмиз is resource stack, ground object, feature or node.
- Choose the smallest compatible path.

## Acceptance

- Chosen path is documented.
- No implementation churn yet.

## Implementation Order

Do after: `FIRE-001-A`.

## 0.14.23 Reconciliation Notes

- `twigs` remains the internal resource key and `хмиз` remains the player-facing noun.
- The current model is intentionally resource-stack based until deeper item-instance work arrives.
