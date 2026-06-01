---
id: VIS-001-B
title: Hide location details in darkness
status: testing
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

## 0.14.5 Slice

- Brief and detailed location rendering now use visibility rules before showing the full location description.
- Dim/dark views without local light show atmospheric darkness copy instead of the full description.
- Local light or clear enough daylight reveals the description again.
