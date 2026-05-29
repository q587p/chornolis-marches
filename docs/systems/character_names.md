# Character Names

Character names are part of the atmosphere of Chornolis Marches, not only a technical onboarding field.

Player-facing onboarding lets a new player either enter their own name or choose one of the world's prepared names.

## Current First Slice

As of `0.13.0`, the implemented first slice includes:

- a choice after pronoun selection: `Обрати ім’я зі списку`, `Випадкове ім’я` or `Ввести власне ім’я`;
- a curated prepared-name data module with stored Ukrainian case forms, origin, rarity and explicit reservation state;
- filtering so already-used player names, named NPC/creature names or reserved prepared names are not offered again;
- filtering prepared-name choices by the pronoun/grammatical gender selected during onboarding, with at least 8 masculine, 8 feminine and 6 plural-form options in the current pool;
- a random prepared-name pick that uses the same pronoun/gender and availability filters as the visible list;
- automatic approval for prepared names, because they are treated as already reviewed by scribes;
- a custom-name warning before free text entry;
- custom names accept Cyrillic names with spaces, hyphens and common apostrophe variants, and can convert fully Latin transliteration into Cyrillic for players without a Ukrainian keyboard;
- compound custom-name suggestions handle simple masculine descriptive first words such as `Великий Вова` -> `Великого Вови`;
- custom names show a final review of all seven case forms before they are saved, with buttons to confirm, edit one case, or enter the name again;
- duplicate checks against existing character names during entry and again immediately before saving, so stale buttons or delayed choices cannot claim a name that was already taken;
- stale onboarding inline buttons are blocked once onboarding is complete, with `/restart` kept as the explicit way to erase the character and begin again;
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

Only available, unused, unreserved names that do not belong to named NPCs or significant creatures should be offered to players.

Prepared names should also match the selected onboarding pronoun:

- `Він` -> masculine prepared names;
- `Вона` -> feminine prepared names;
- `Вони` -> plural-form prepared names.

The current code-level pool is still intentionally modest, but it now covers more playtest variety across masculine, feminine and plural-form choices. The intended later registry should grow toward roughly a hundred reviewed prepared names across genders, regions and rarity bands.

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

For the current Telegram onboarding, custom names should be saved in Cyrillic. Spaces, hyphens and common apostrophe forms are allowed inside a name. If a player does not have a Ukrainian keyboard, they may enter a fully Latin transliteration such as `Zdravko`, which is converted to `Здравко` before validation and case review. Mixed alphabets, digits, emoji and invisible characters are rejected.

## Onboarding UX

First creation choice:

- `Обрати ім’я зі списку`;
- `Випадкове ім’я`;
- `Ввести власне ім’я`.

Prepared-name view should show:

- name;
- short origin or region;
- rarity;
- whether all case forms are present;
- pronunciation when useful.

The `Випадкове ім’я` button should choose only from the same currently available prepared names that match the selected pronoun/grammatical gender.

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
- Larger random-name pools with regional weighting.
- Separate entities for names, nicknames and public titles.
- Folk forms, diminutives and forms of address.
- NPC reactions to strange, foreign or ominous names.
