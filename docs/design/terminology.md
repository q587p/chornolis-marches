# Terminology

Chornolis Marches should prefer Ukrainian, atmospheric and diegetic terminology over direct English RPG calques.

## Core UI Terms

| English / generic RPG term | Preferred Ukrainian term | Notes |
|---|---|---|
| HP / Health Points | Життя | Use for simple numeric health display. |
| Health / condition | Стан | Use for diegetic/descriptive health state. |
| Stamina | Снага | Main stamina/resource term. Short, atmospheric, Ukrainian. |
| Inventory | Речі / Поклажа | “Речі” works best for a button; “Поклажа” for a fuller inventory screen. |
| Equipment | Спорядження | Equipped gear, weapons, tools, armor. |
| Loot | Здобич | Items gained from gathering, hunting, combat or scavenging. |
| Location | Місцина | Preferred over “локація”. |
| Look | Озирнутися | General look-around action. |
| Examine | Роздивитися | Closer inspection of an object, creature or place. |
| Stats | Риси | Character/entity attributes. |
| Skills | Навички | Learned/improved abilities. |
| Combat | Сутичка | Preferred atmospheric term for combat encounter. |

## Stamina Decision

Use “Снага” as the player-facing equivalent of Stamina.

Examples:
- Снага
- Запас снаги
- Витрата снаги
- Бракує снаги
- Відновити снагу
- Ви виснажені

Avoid “Витривалість” as the main UI term for Stamina because it feels more technical/sport-like and less atmospheric.

Important:
“Снага” should be treated as a resource/bar, not necessarily as a core attribute.

If a separate endurance-like attribute is needed, prefer:
- Живучість
- Стійкість

## HP / Health Direction

Avoid showing “HP” in player-facing text.

Preferred layers:
- Життя — numeric health/resource display.
- Стан — diegetic condition summary.
- Рани — wound/status layer if implemented later.

Examples:
- Життя: 18/25
- Стан: поранений
- Рани: легка рана, забій

## Sleep and Dream Direction

Keep sleep terms plain, Ukrainian and diegetic.

Preferred terms:

| English / generic term | Preferred Ukrainian term | Notes |
|---|---|---|
| Sleep | Сон / Спати | Ordinary sleep unless explicitly marked otherwise. |
| Ordinary sleep | Звичайний сон | The body sleeps in the current місцина. |
| Tutorial sleep | Навчальний сон | Entered explicitly through `/sleep tutorial`. |
| Lucid dream | Усвідомлений сон | A dream instance with meaningful action/awareness. |
| Wake up | Прокинутися / Прокинутись | Use for `/wake` and manual waking. |
| Lie down | Лягти | Command/action to change posture only. |
| Lying | Лежати / лежить | Posture, not necessarily sleep. |
| Dream presence | Сновидна присутність | The dream-acting presence; not a soul. |
| Awareness returning | Притомність повертається | Good phrasing for waking. |

Avoid Christian framing for dream travel. Do not use “soul”, “душа”, sin/salvation/afterlife language or church-coded explanations as the default model for dreams.

Preferred dream-travel phrasing:

- `Ваша увага провалюється глибше в сон.`
- `Сновидна присутність ступає між туманом і корінням.`
- `Притомність повертається до тіла.`

Avoid:

- `Ваша душа покидає тіло.`
- `Душа повертається з потойбіччя.`

## Inventory Direction

Avoid using “Inventory” or “Інвентар” in player-facing UI unless a very neutral technical term is needed.

Preferred:
- Речі — short menu/button label.
- Поклажа — atmospheric inventory section.
- Спорядження — equipped items.
- Торба / Наплічник — container flavor if needed.
- Здобич — newly acquired items.

## Money Direction

Use these player-facing money forms for the first money MVP:

- `шаг`, `шаги`, `шагів`;
- `ґривня`, `ґривні`, `ґривень`.

The persisted resource key remains `hryvnia`, but Chornolis UI, news and diegetic docs should not print modern `гривня` / `гривень` forms for this resource.

## Additional Preferred Replacements

| Avoid | Prefer |
|---|---|
| Quest | Справа / Доручення / Завдання |
| NPC | Персонаж / Місцевий / Істота, depending on context |
| Mob | Істота / Звір / Потвора |
| Drop | Здобич / Залишки |
| Equip | Спорядити |
| Unequip | Зняти |
| Attack | Вдарити / Атакувати |
| Fight | Битися / Вступити в сутичку |
| Damage | Шкода / Поранення, depending on context |
| Defense | Захист |
| Armor | Обладунок / Броня |
| Weapon | Зброя |
| Resource | Запас / Припас |
| Cooldown | Затримка / Перепочинок |
| Buff | Підсилення |
| Debuff | Ослаблення |

## Canonical Short List

Use this as the current preferred vocabulary:

- HP → Життя / Стан
- Stamina → Снага
- Inventory → Речі / Поклажа
- Equipment → Спорядження
- Loot → Здобич
- Location → Місцина
- Look → Озирнутися
- Examine → Роздивитися
- Stats → Риси
- Skills → Навички
- Combat → Сутичка
- Sleep → Сон / Спати
- Wake → Прокинутися / Прокинутись
- Lie down → Лягти
- Lucid dream → Усвідомлений сон
- Dream presence → Сновидна присутність
