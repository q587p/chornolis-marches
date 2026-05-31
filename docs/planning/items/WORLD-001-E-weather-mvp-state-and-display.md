---
id: WORLD-001-E
title: Weather MVP state and display
status: testing
type: feature
area: world_time
priority: high
estimate: 1-2h
tags:
  - world-time
  - weather
  - 0.14
depends_on:
  - WORLD-001-C
---

# WORLD-001-E: Weather MVP State and Display

## Goal

Add a small persistent weather state that can later affect light, visibility, tracks and mood without becoming a full ecology/weather simulator.

## First Scope

- Persist weather type, intensity and next change world minute.
- Weather advances through the same world-time heartbeat/service.
- Add `/weather` or make `/time` include a compact weather summary.
- Use simple weighted random weather by broad season/circle if needed.
- Avoid external APIs and real-world weather.

## Acceptance

- Weather survives restart.
- Weather can change after an in-world duration.
- Weather changes can create non-spammy world events or scribe/debug logs.
- `/time` or `/weather` shows current weather in atmospheric text.

## Implementation Order

Do after: `WORLD-001-C`; can land before or with `WORLD-001-D` if small.

## 0.14.3 Slice

- Added a small internal weather service with weather key, intensity, duration and weighted transitions.
- Weather advances through the shared world-time service and writes a non-proactive `WorldEvent` when it changes.
- `/time` now includes compact weather text; `/weather` shows the current weather as its own atmospheric readout.
- Weather remains internal Chornolis state only. It does not use real-world weather, local time, timezone or external APIs.
 
