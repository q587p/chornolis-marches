---
id: VIS-001-B
title: Hide location details in darkness
status: next
type: feature
area: visibility
priority: high
estimate: 1-2h
tags:
  - visibility
  - look
  - night
depends_on:
  - VIS-001-A
---

# VIS-001-B: Hide location details in darkness

## Goal

At night without light, reduce location detail.

## First Scope

- Use visibility helper in location rendering.
- Show location name and darkness text.
- Reveal full text with light/day.

## Acceptance

- Night without light hides description.
- Light reveals description.
- Player understands this is intentional.

## Implementation Order

Do after: `VIS-001-A`.
