# Calendar and World Reckoning

## Current public date

The current starter date is:

> 587 літо після Великого Відступу — рік Сича під Тихим Вітром.

The current starter timestamp for the internal world clock is:

```text
Пізня весна, Коло Зеленого Шуму, 17 день, передвечір’я.
```

For the 0.14 world-time MVP, this becomes the initial stored world-clock state, not a real-world date.

Suggested concrete start:

- year: `587`;
- lunar circle: `5` / `Коло Зеленого Шуму`;
- day of circle: `17`;
- clock: `17:00`;
- daypart: late day / `передвечір'я`.

The clock advances by elapsed real milliseconds according to the world-time scale. It must not sync to server time of day, player timezone or real calendar date.

This is intentionally not tied to Christianity, the Holocene calendar, Trypillia or real historical chronology. Chornolis Marches is a separate, loosely related mythic space.

## Player-facing calendar surface

The starter camp has an inspectable `Береста кіл року` feature. It lists the lunar circles in order without numbers, as a local memory aid rather than a technical table, and adds short seasonal work notes: warmth and repairs in cold circles, paths and herbs in thawing circles, hay/fishing/honey in green and hot circles, supplies and caution before the dark half of the year.

Scribe/admin debug surfaces may show the exact ordinal circle number, e.g. `місячне коло 5/13 — Коло Зеленого Шуму`, but ordinary player-facing calendar copy should usually prefer names, order and atmosphere over raw numbering.

## Era

The current era counts years **after the Great Retreat**.

The Great Retreat is deliberately not fully explained yet. It may later become:

- a historical collapse;
- a retreat from the deep forest;
- a retreat from old settlements;
- a boundary event between people and the Chornolis;
- a disputed story where villages, elders, volkhvy and spirits remember different truths.

## Year names

Years may have common folk names in addition to their number.

The current format is:

```text
587 літо після Великого Відступу — рік Сича під Тихим Вітром.
```

The year name should be usable in:

- `/start` and onboarding text;
- `/time`;
- `/weather`;
- news;
- rumors;
- NPC speech;
- world events;
- future calendar UI.

## 13 beasts of the year

The long-term calendar should use 13 beasts instead of 12, so it can align better with 13 lunar circles.

Draft beast cycle:

1. Полівка
2. Заєць
3. Лис
4. Вовк
5. Рись
6. Вепр
7. Олень
8. Тур
9. Ведмідь
10. Ворон
11. Сич
12. Журавель
13. Змій

`Змій` should sit at the edge between animal, omen and myth.

## 13 year signs

1. Молодий Корінь
2. Мокра Стежка
3. Тихий Вітер
4. Гострий Серп
5. Червоний Жар
6. Медова Вода
7. Чорна Земля
8. Снігова Межа
9. Вербовий Дим
10. Сліпий Дощ
11. Нічний Корінь
12. Крива Стежка
13. Довга Тінь

In prose, use the instrumental form:

```text
рік Сича під Тихим Вітром
рік Змія під Гострим Серпом
рік Вовка під Сніговою Межею
```

## Future lunar calendar

The deeper calendar is intentionally Icebox-level for now.

## 0.14 Minimal Lunar Clock

The full lunar calendar remains a deeper future system, but 0.14 needs a minimal lunar clock because moonlight affects night visibility.

0.14 should include:

- 13 lunar circles per year;
- 28 days per lunar circle;
- moon phase label derived from day of circle;
- moon illumination value used by the light/visibility helper;
- simple season label derived from circle if needed for weather weighting.

0.14 should not include:

- sacred days;
- ritual calendars;
- local calendar disputes;
- deep omen tables;
- complex season-specific ecology.

Preferred future direction:

- 13 lunar circles in a year;
- moon phases inside each circle;
- 4 seasons layered over the year;
- a later 365-day year model, plus rare 366-day years according to an in-world leap reckoning;
- an extra day outside ordinary lunar-circle counting that feels mysterious, mythic and worth preparing for, not merely technical calendar padding;
- sacred, dangerous or unlucky days;
- season- and moon-dependent creatures, resources, rituals and events;
- local names for circles may differ between settlements, volkhvy, hunters and spirits.

Current working names for the 13 lunar circles:

1. Коло Паморозі
2. Коло Вовчого Сліду
3. Коло Проталин
4. Коло Соку
5. Коло Зеленого Шуму
6. Коло Купальського Жару
7. Коло Липового Меду
8. Коло Серпа
9. Коло Вересу
10. Коло Жовтого Листу
11. Коло Чорної Стежки
12. Коло Груддя
13. Коло Довгої Ночі

## Design notes

The calendar should be readable first and mythic second.

A player should understand that it is the 587th year after some important Retreat, but not immediately know everything about the event.

Good text examples:

```text
Зараз 587 літо після Великого Відступу — рік Сича під Тихим Вітром.
```

```text
Старі кажуть: у рік Сича ліс рідко говорить першим, зате добре чує тих, хто заходить надто далеко.
```

```text
Це сталося за три літа до Року Сича, коли річка двічі вставала туманом.
```
