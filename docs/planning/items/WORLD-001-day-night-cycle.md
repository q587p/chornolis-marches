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
- Derive dawn/day/dusk/night from the internal Chornolis world clock, not from server local hour, player timezone or real-world time of day.
- At night, hide full location descriptions without light.
- Night-only creatures and events can appear.
- Light sources reveal descriptions, exits, creatures and resources.
- `/time` should read the same world-time state rather than only static starter flavor.

## Future Daypart-Gated Exits

- Add authored exits or passage states that depend on the internal daypart, for example a path that is only safely visible at dawn, a marsh crossing that opens toward evening, or a spirit-thin threshold that appears only at dusk.
- Keep this explicit and diegetic: the location or feature should hint at the timing through `/look`, `/examine`, `/time` or local signs, instead of silently removing exits with no explanation.
- Use the internal Chornolis world clock only. Do not bind these exits to server local time, player timezone or real-world sunrise/sunset.
- Hidden/temporary exits should still respect ordinary movement rules when available and should not become free teleportation, quest acceptance or broad route replay.
- Add tests for visible exit lists at different dayparts once the first daypart-gated passage is implemented.
