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
- Starter weather fields are part of the stored world state; `0.14.3` adds the first weather simulation and player-facing weather display slice.
- Production seed refresh creates the singleton `WorldState` row if it is missing, but it must not rewind an existing live world clock. Only explicit world/full reset should return time and weather to the starter state.
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
- `/time` reads the stored/derived world-clock state and shows the current year, lunar circle, day, approximate clock phrase, daypart, moon phase, weather and a compact light label. Ordinary player-facing time should not expose exact minutes; keep minute-level labels in scribe/admin debug surfaces such as `/timeDebug`.
- The heartbeat emits compact player-facing notices when the internal daypart changes: dawn, day, dusk or night. These notices describe the world getting lighter or darker, but they do not yet apply full darkness/visibility penalties. Daypart notices are waking-world messages only: tutorial dream locations and future dream layers at `z <= -10` should not receive them, so ordinary world time does not interrupt dream scenes.
- Seed creates missing world-clock storage without rewinding existing time; `/reset world` and `/reset full` return the world clock to the canonical starter timestamp.

`0.14.3` adds the first weather/light foundation:

- `WorldState.weatherKey`, `weatherIntensity` and `weatherEndsAtMinute` store a tiny internal weather state.
- Weather advances through the shared world-time service and writes non-proactive `WorldEvent` rows when it changes.
- `/time` and `/weather` both read through the shared world-time service, so either command may advance stored weather state and create non-proactive weather-change events when enough internal time has elapsed.
- `/weather` shows the current Chornolis weather as a compact atmospheric readout.
- The shared light snapshot helper combines daypart, moon illumination, weather modifiers and optional local active light into one reusable result for future visibility consumers.

`0.14.4` adds the first debug/visibility foundation:

- `/timeDebug` shows scribe/admin-only exact internal world time, weather and local light state.
- `/timeSet` and `/weatherSet` let scribes force QA cases such as dusk, night, full moon and storm without waiting.
- `/timeSet` can affect ordinary sleep duration and auto-wake because those checks use internal world minutes; use it carefully during live sessions.
- Brief `/look` consumes the shared visibility service instead of directly checking local light.

`0.14.5` makes darkness affect player-facing visibility:

- Brief and detailed location views reduce descriptions, nearby beings, ground objects, resources and track hints when light is dim/dark.
- `/track` checks visibility before revealing track lines.
- Darkness copy remains diegetic; raw light scores stay in scribe/admin debug surfaces.

Feature-specific darkness copy and ordinary sleep remain later `0.14.x` slices.

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
