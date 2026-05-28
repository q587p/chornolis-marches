# Character Names

Character names are part of the atmosphere of Chornolis Marches, not only a technical onboarding field.

Player-facing onboarding lets a new player either enter their own name or choose one of the world's prepared names.

## Current First Slice

As of `0.12.12`, the implemented first slice includes:

- a choice after pronoun selection: `Обрати ім’я зі списку` or `Ввести власне ім’я`;
- a small curated prepared-name data module with stored Ukrainian case forms, origin, rarity and explicit reservation state;
- filtering so already-used or reserved prepared names are not offered again;
- automatic approval for prepared names, because they are treated as already reviewed by scribes;
- a custom-name warning before free text entry;
- exact duplicate checks against existing character names;
- a first forbidden-name list for creature/spirit/sacred or very famous names such as `Вовк`, `Миша`, `Лісовик`, `Упир`, `Сварог`, `Ґандальф`.

This is still a code-level curated data module, not yet a full database-backed name registry.

## Prepared Names

The world should maintain a curated pool of prepared names reviewed by scribes. The current pool is intentionally small and lives in a typed data module as the first playable slice; later it should move into database-backed content.

Each prepared name should store:

- all Ukrainian case forms;
- cultural or regional origin;
- rough rarity;
- optional pronunciation notes;
- approved short forms and forms of address;
- reservation and usage state.

Only available, unused and unreserved names should be offered to players.

Preferred cultural layers:

- Slavic and Old Rus;
- Baltic;
- Greek / Byzantine;
- Crimean Tatar;
- steppe Turkic;
- Vlach / Romanian;
- occasional Scandinavian or Caucasian names when they fit the borderland tone.

The goal is not a museum-clean list. Names should sound like they could belong on a frontier shaped by forest, steppe, trade roads and old myths.

## Name Registry

The game should keep a world name registry that includes:

- living player characters;
- known NPCs;
- significant creatures;
- legendary figures;
- important spirits and beings.

Validation should check:

- exact matches;
- similarity close enough to confuse players;
- conflicts with creature/species names or famous in-world beings;
- reserved event/NPC names.

Examples of names to reject as player names:

- `Вовк`;
- `Миша`;
- `Ведмідь`;
- `Лісовик`;
- `Упир`;
- `Ворон`;
- `Кіт`;
- `Сокіл`.

These read as creatures, spirits, nicknames or world nouns rather than suitable personal names.

## Custom Name Warning

Before a player enters a custom name, onboarding should warn that the following are not acceptable:

- names of gods, deities or sacred mythological/religious figures;
- names confusingly similar to existing characters;
- common words that are not personal names;
- animal, creature or spirit names;
- names that clearly do not fit the Chornolis borderland tone;
- names of very famous real or fictional people;
- random letter strings;
- rude, obscene or ambiguous names.

Best recommendation: choose a Slavic or borderland-adjacent name that fits the setting.

Careful exceptions can include Greek, Baltic, Crimean Tatar, steppe, West Slavic or occasional Scandinavian names.

## Onboarding UX

First creation choice:

- `Обрати ім’я зі списку`;
- `Ввести власне ім’я`.

Prepared-name view should show:

- name;
- short origin or region;
- rarity;
- whether all case forms are present;
- pronunciation when useful.

Custom-name validation should show:

- uniqueness check;
- similarity check;
- setting-fit check;
- generated or entered Ukrainian case forms;
- status: `Схвалено Писарями`, `Потребує перевірки`, or `Недопустиме`.

Rare or uncertain custom names should go through the scribe review flow rather than being silently accepted.

## Later Systems

- Manual approval of rare names by scribes.
- Reserved names for events, NPCs and future story figures.
- Regional name popularity and cultural layers.
- Thematic name generator.
- Random pick from available prepared names.
- Separate entities for names, nicknames and public titles.
- Folk forms, diminutives and forms of address.
- NPC reactions to strange, foreign or ominous names.
