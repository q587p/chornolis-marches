---
id: FIRE-001-A
title: Active light connects to visibility
status: next
type: feature
area: survival
priority: high
estimate: 1-2h
tags:
  - fire
  - light
  - visibility
depends_on:
  - VIS-001-A
---

# FIRE-001-A: Active light connects to visibility

## Goal

Let campfires and carried light reveal darkness-hidden information.

## First Scope

- Use existing light checks if available.
- Wire active local light into visibility helper.

## Acceptance

- Active campfire reveals location detail at night.
- No active light means reduced detail.

## Implementation Order

Do after: `VIS-001-A`.
