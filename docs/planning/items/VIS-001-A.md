---
id: VIS-001-A
title: Shared visibility service skeleton
status: next
type: technical
area: visibility
priority: high
estimate: 1-2h
tags:
  - visibility
  - night
  - light
depends_on:
  - WORLD-001-C
---

# VIS-001-A: Shared visibility service skeleton

## Goal

Add one place for light/darkness visibility decisions.

## First Scope

- Create service/helper for location description, nearby beings, tracks and ground objects.
- First implementation can be simple.

## Acceptance

- At least one caller uses the helper.
- No duplicated darkness logic added.

## Implementation Order

Do after: `WORLD-001-C`.
