---
id: CAL-001
title: Deep calendar, sacred days and named years
status: icebox
type: system
area: world_time
priority: medium
tags:
  - calendar
  - world-time
  - moon-phases
  - seasons
  - folklore
  - atmosphere
depends_on:
  - day-night-cycle
---

# Deep Calendar, Sacred Days and Named Years

## Summary

Add a deeper calendar system for Chornolis Marches after the basic internal world clock, day/night, moon illumination and weather/light foundations are stable.

The current starter date is:

> 587 літо після Великого Відступу — рік Сича під Тихим Вітром.

## Direction

The deep calendar should support:

- seasons;
- named years;
- sacred, dangerous or strange days;
- a future 365-day year model, with a rare 366th leap day under whatever in-world leap-year reckoning Chornolis eventually adopts;
- a mysterious extra day outside ordinary lunar-circle counting: mythic, liminal and dangerous enough that players can be warned in advance and prepare for it;
- named weekdays or day-signs that affect the world, such as a "frog day" when frogs are more common, frog-related omens are more likely, or a small frog-linked event can happen;
- NPC rumors and world events tied to time;
- future display in `/time`, `/news`, `/look`, `/examine`, `/world` or a separate calendar command.

The minimal 0.14 light foundation owns:

- 13 lunar circles;
- 28 days per lunar circle;
- moon phase labels;
- moon illumination values used by visibility/light helpers.

## Weekday and day-sign naming

Avoid direct calques from other mythic calendars such as "Thor's day".

If Chornolis gets named weekdays or recurring day-signs, they should feel Ukrainian/Slavic and local to the setting rather than imported. Prefer names rooted in local creatures, spirits, landscape, weather, work, ritual or omen logic, for example "день жаб", "день сича", "день межі", "день тихого вітру" or similar setting-specific names. Final names should be chosen for tone, readability and folklore flavor, not strict historical reconstruction.

## Extra day / leap-day direction

The current 13 circles × 28 days foundation gives 364 days, which is useful for the MVP moonlight model. Far in the future, the deeper calendar should decide how Chornolis accounts for the missing day and occasional leap day:

- ordinary years may have a 365th day outside the named lunar circles;
- some years may have a 366th day, based on an in-world leap reckoning rather than a direct real-world calendar copy;
- the extra day should feel mysterious, mythic and liminal, not just a bookkeeping correction;
- players should get advance warnings through `/time`, rumors, camp signs, dreams, weather/omens or local NPC comments;
- preparation can matter: food, fire, shelter, offerings, travel caution, shrine/kapyshche rituals or avoiding certain wilderness routes;
- the day can become a special event surface for spirits, odd ecology, dangerous visibility, dreams or boundary crossings.

## Era

Use **після Великого Відступу** as the main era.

Do not explain the Great Retreat too early. It should remain a strong mythic/historical hook.

## 13 beasts of the year

Use 13 beasts instead of 12 so the cycle can pair naturally with 13 lunar circles.

Draft cycle:

1. Полівка
2. Заєць
3. Лис
4. Вовк
5. Вепр
6. Олень
7. Тур
8. Ведмідь
9. Ворон
10. Журавель
11. Сич
12. Змій
13. Рись

## Current year

587 should be treated as the starting visible year:

> 587 літо після Великого Відступу — рік Сича під Тихим Вітром.

## Notes

This item belongs in Icebox for now because it covers deep calendar lore and ritual timing, not the minimal moonlight math needed by 0.14.
