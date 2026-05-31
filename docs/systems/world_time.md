# World Time

`0.14.x` starts the Night, Light and Firewood line with a deliberately tiny world-time foundation.

## Current Model

The first world-time source is derived from the real clock in `Europe/Kyiv`.

`src/services/worldTime.ts` exposes:

- `getCurrentWorldTime(...)`;
- `worldDaypartForHour(...)`;
- `WorldDaypart = "dawn" | "day" | "dusk" | "night"`.

This avoids a database migration for the first slice and gives `/time`, visibility and future light rules one shared helper to call.

## Dayparts

The current rough daypart boundaries are:

- `dawn`: 05:00-07:59;
- `day`: 08:00-17:59;
- `dusk`: 18:00-20:59;
- `night`: 21:00-04:59.

The exact thresholds are intentionally simple. Future patches can make them seasonal, regional or moon-aware without changing every caller.

## Player-Facing Use

`/time` now reads this helper and shows the current daypart with atmospheric copy.

Darkness does not yet hide location details in this slice. The next visibility patches should decide what daypart and local light do to:

- location description detail;
- nearby beings;
- tracks;
- ground objects.

## Out Of Scope For 0.14.0

- stored calendar rows;
- moon phases;
- season advancement;
- accelerated in-world time;
- ordinary sleep auto-wake;
- observation XP or `/observe`.

`0.14` makes seeing and not seeing systemic. `0.15` can later make watching and learning systemic.
