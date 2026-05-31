# World Time

`0.14.x` starts the Night, Light and Firewood line with an internal Chornolis world clock.

The clock may use real elapsed milliseconds to advance from `lastAdvancedAt`, but it must not bind day/night to real-world time of day, server local hour, user timezone, real date, OpenWeather or any external time/weather service.

## Canonical Scale

```text
1 in-game minute = 2_000 ms real elapsed time
1 in-game hour = 120_000 ms real elapsed time
1 in-game day = 24 in-game hours = 48 real minutes
1 lunar circle = 28 in-game days
1 in-game year = 13 lunar circles = 364 in-game days
```

## Starter Timestamp

Preserve the current public date as the initial world-clock state:

```text
587 літо після Великого Відступу — Рік Сича під Тихим Вітром.
Пізня весна, Коло Зеленого Шуму, 17 день, передвечір'я.
```

Suggested concrete start:

- year: `587`;
- lunar circle: `5` / `Коло Зеленого Шуму`;
- day of circle: `17`;
- clock: `17:00`;
- daypart: late day / `передвечір'я`.

If implementation stores `absoluteMinute` from the beginning of the current year:

```text
START_ABSOLUTE_MINUTE = (((5 - 1) * 28 + (17 - 1)) * 24 + 17) * 60
START_ABSOLUTE_MINUTE = 185_340
```

Scribe/admin reset behavior should preserve this as the canonical start:

- `/reset world` resets the internal world clock and weather state back to the starter timestamp/state.
- `/reset full` does the same as part of full world reset.
- `/reset stats` does not change world time.

## Advancement Rule

World time advances by elapsed real milliseconds as a rate only:

```text
elapsedMs = now - lastAdvancedAt
advancedMinutes = floor(elapsedMs / 2_000)
absoluteMinute += advancedMinutes
lastAdvancedAt += advancedMinutes * 2_000 ms
```

Do not use `Date.getHours()`, server timezone, player timezone or real-world calendar date to decide dawn/day/dusk/night.

## Boundaries And Non-Sources

- Public chronicles may group real `createdAt` timestamps by `Europe/Kyiv` for the archive UI. That formatting is only a public archive convenience, not a world-time source. Do not derive Chornolis daypart, moon, weather or world events from the chronicle display date.
- Starter weather fields are already part of the stored world state, but weather simulation and player-facing weather display remain deferred until the weather MVP slice.
- `/reset world` and `/reset full` reset the clock and weather state to the canonical starter values. `/reset stats` must not reset world time, weather or `lastAdvancedAt`.

## 0.14 Scope

0.14 should include:

- persistent internal world-clock state;
- daypart helper from internal world minutes;
- `/time` reading actual internal world state;
- 13 lunar circles per year;
- 28 days per lunar circle;
- moon phase label;
- moon illumination value for night lighting;
- weather MVP state and display;
- shared light snapshot helper combining daypart, moon, weather and active local light;
- visibility consumers that ask the shared helper instead of duplicating time/light math.

## Current Runtime Slice

`0.14.1` implements the first stored-clock foundation:

- `WorldState.absoluteMinute` stores the current internal Chornolis minute.
- `WorldState.lastAdvancedAt` stores the real timestamp used only to calculate elapsed time since the previous advancement.
- `worldTick()` advances the stored minute count through the shared world-time service.
- `/time` reads the stored/derived world-clock state and shows the current year, lunar circle, day, approximate clock, daypart and moon phase.
- Seed, `/reset world` and `/reset full` return the world clock to the canonical starter timestamp.

Weather, light snapshots, visibility reduction, darkness effects and ordinary sleep remain later `0.14.x` slices.

## Out of Scope

- sacred days;
- ritual calendars;
- local calendar disagreements between villages, volkhvy and spirits;
- deep moon omens;
- complex season-specific ecology;
- external weather APIs;
- real-world local time or timezone sync;
- ordinary sleep auto-wake until time/light/rest semantics are stable;
- observation XP or `/observe`.

`0.14` makes seeing and not seeing systemic. `0.15` can later make watching and learning systemic.
