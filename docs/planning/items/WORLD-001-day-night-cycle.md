---
id: WORLD-001
title: Day/night cycle
status: next
type: feature
area: world_time
priority: high
tags:
  - world
  - atmosphere
  - visibility
  - liminality
---

# Day/night cycle

## Goal

Add world time phases that change visibility, danger and available encounters.

## Rules

- 0.11.6-0.11.8 foundation: campfires and carried torches already have timed light behavior and can reveal nearby targets; the missing piece is world time and darkness rules.
- Track dawn, day, dusk and night.
- At night, hide full location descriptions without light.
- Night-only creatures and events can appear.
- Light sources reveal descriptions, exits, creatures and resources.
- `/time` should read the same world-time state rather than only static starter flavor.
