---
id: WORLD-004
title: Time/calendar/weather command split
status: backlog
type: ux
area: world_time
priority: medium
estimate: 1-2h
tags:
  - world-time
  - calendar
  - weather
  - commands
  - tutorial
depends_on:
  - WORLD-001-D
  - WORLD-001-E
---

# WORLD-004: Time/Calendar/Weather Command Split

## Goal

Reduce the overloaded `/time` surface so ordinary players can quickly ask
"what time is it now?" without receiving the whole calendar, weather and light
readout every time.

## Current State

`/time` currently works as a broad "Час Порубіжжя" card. It includes year,
season, lunar circle, day of circle, daypart, approximate clock, moon phase,
weather and light. That was useful for the first world-time MVP, but it is now
too much for a quick time check and overlaps with `/weather`.

## Future Shape To Decide

- Keep `/time` short and focused:
  - current daypart;
  - approximate in-world clock;
  - perhaps one short light/daypart sentence;
  - no full year/circle/weather bundle by default.
- Add or choose a fuller calendar command, likely `/calendar`, with Ukrainian
  aliases such as `календар`, `дата`, `коло`, or another better name if play
  text suggests one.
- Keep `/weather` as the weather surface and make tutorial/help copy point to
  it when the lesson is about sky, rain, fog or visibility.
- Decide whether `/time` should link to `/calendar` and `/weather` through
  buttons or text hints after the first use.
- Keep `/timeDebug` as the exact scribe/admin surface.

## Tutorial / Help Follow-Up

- Update the tutorial time/weather lesson so it does not teach `/time` as the
  only broad world-state command.
- If the lesson needs both surfaces, teach a small pair: `Час` (`/time`) for
  current time and `Погода` (`/weather`) for sky/visibility.
- If `/calendar` lands, add it to help/news/docs with the usual Ukrainian label
  plus slash command in parentheses.

## Acceptance

- `/time` is concise enough to use repeatedly.
- The old full date/circle text remains available through a clearly named
  command such as `/calendar` or an equivalent chosen label.
- `/weather` remains available and documented as the weather-specific surface.
- Help/tutorial/news command hints use clickable underscore form where needed,
  such as `/sleep_tutorial` style for multi-word commands.
- No exact technical clock/debug data appears in ordinary player-facing text;
  that stays behind `/timeDebug`.

## Notes

- This is a future UX split, not a request to remove calendar lore.
- Naming is still open. `/calendar` is the current obvious candidate, but the
  final label should be checked against Ukrainian tone and existing aliases.
