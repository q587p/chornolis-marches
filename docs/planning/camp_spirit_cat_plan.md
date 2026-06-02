# Camp Spirit Cat Plan

## Goal

Додати табірного кота-бережника як маленьку, атмосферну, camp-bound living-world систему: він ловить мишей у таборі, реагує на сире м’ясо, ластиться до гравців, гріється біля вогню й тілом сигналізує про погоду/час доби, не виходячи за межі табору і не перетворюючись на companion-пета. Годування сирим м’ясом має бути першим практичним прикладом generic `give`, а не окремим social.

## Design constraints

- No player speech from the cat.
- No ordinary aging/death/hunger loop.
- No leaving camp.
- No broad predator ecology outside camp.
- No competition with owls/foxes/wolves in the wilderness.
- No full taming/ownership in MVP.
- Prefer small config/data changes over schema migration unless existing code cannot express immortality/camp-bound behavior safely.

## Suggested sequence

### Slice 0 — GIVE-001 / generic give command

Move `give` earlier. Implement `/give <item> <target>` / `дати <предмет> <кому>` enough for `Дати сире м’ясо коту`. Keep `/feed_raw_meat` and typo-tolerant `/feed_raw_meet` only as aliases that route into generic `give`.

Outcome: feeding the cat is a reusable item-transfer path, not a cat-only social action.

### Backlog / near-backlog — GIVE-002 / Ukrainian give parser grammar

After the first `give` path exists, add robust Ukrainian parsing for common inflections, partial item phrases and apostrophe variants. Desired examples include `дати м’яса коту`, `дати мясо кіт`, `дати сирого м’яса бережнику`, and hyphenated/case-marked target aliases such as `коту-бережнику`. Use existing Ukrainian lexicon, grammar helpers, target aliases and item/resource naming rules; do not hardcode this only for the cat.

Outcome: full `give` and later barter can understand natural Ukrainian variants without becoming a brittle one-off parser.

`0.15.12` note: the first narrow parser slice now canonicalizes these raw-meat/camp-cat examples to `give raw meat cat`. Broader item transfer, multiple target ambiguity, player/NPC gifts and barter still belong to the follow-up `GIVE-002`/`BARTER-001` work.

### Slice 1 — CAT-001 / foundation

Add the system note, species/behavior config, seed or starter placement, and lifecycle guard.

Outcome: the cat exists, survives ticks, and can be inspected/seen like a normal visible being.

### Slice 2 — CAT-002 / camp boundary and vertical movement

Keep the cat inside camp-tagged locations. Add up/down preference and flee-down behavior.

Outcome: the cat can move around camp and up/down camp nodes without leaking into wilderness.

### Slice 3 — CAT-003 / mouse priority

Let the cat detect and hunt mice in camp before any meat/idle behavior.

Outcome: if a mouse is in camp, the cat prioritizes it.

### Slice 4 — CAT-004 / meat scene

Add interest in raw meat in camp box / ground / player inventory. Start a scene before theft so players get readable affordances. `Дати сире м’ясо` must call `give сире м’ясо коту`.

Outcome: the cat tries to steal or beg for raw meat, but nearby players can respond; voluntary feeding uses generic `give`.

### Slice 5 — CAT-005 / social gestures

Add or reuse `SHOO`, `WAVE_OFF`; add `RUB_AGAINST` and maybe generalized `CIRCLE_AROUND`. Do **not** add `FEED_RAW_MEAT` as a social action. Feeding is `GIVE-001`.

Outcome: the cat can be shooed, can ластитися to someone with meat, and can expose a `give`-backed feed affordance.

### Slice 6 — CAT-006 / ambient and weather/time body language

Add nonverbal lines based on daypart, weather, fire/light and darkness.

Outcome: the cat makes the camp feel alive without giving exact debug information.

### Slice 7 — CAT-007 / tests and tuning

Add focused scripts and snapshot-ish assertions for behavior priority and social copy.

Outcome: safe from regressions.

### Slice 8 — CAT-008 / docs/news/release notes

Update docs, planning, news and release notes.

Outcome: the feature is documented in project style.

### Adjacent early slice — BARTER-001 / exchange and barter foundation

After `GIVE-001`, move basic exchange/barter planning earlier so future hand-ins, NPC offers and settlement interactions reuse the same transfer primitives instead of growing one-off command paths.

Outcome: `give` is the one-way transfer primitive; barter/exchange becomes the two-sided follow-up path.

## Implementation notes for Codex

Codex should inspect the current repo before editing. Likely search terms:

```bash
rg "mouse|mice|rabbit|owl|fox|wolf|Creature|WorldAction|GREET|EAT|ATTACK|GIVE|give|barter|exchange|trade|campfire|raw meat|meat|social|posture|weather|daypart|visibility|hidden|sleep" src scripts prisma docs
```

Useful existing areas suggested by release/test history:

- creature species / starter animals;
- world tick behavior;
- predator selection and `EAT` actions;
- meat tests;
- existing inventory/resource transfer helpers;
- social aliases / target interactions;
- weather/daypart/visibility helpers;
- admin creature tests;
- planning item export.

## Risk watchpoints

- If the cat kills too many mice, the local mouse loop can disappear and the feature becomes invisible.
- If meat theft fires too often, it becomes annoying rather than cute.
- If the cat reveals exact hidden danger, it becomes an exploit.
- If the cat can be attacked/killed by ordinary combat, the “spiritual camp guardian” fantasy breaks.
- If the cat follows players, it becomes a companion system, which is out of scope.
- If feeding is implemented as `FEED_RAW_MEAT` social instead of `give`, it creates the wrong precedent for barter/exchange.
- If `give` parser support is hardcoded only for `сире м’ясо коту`, later gifts/barter will inherit brittle one-off parsing instead of shared Ukrainian grammar/lexicon support.

## Tuning starting values

These are design suggestions, not hard constants:

- `mousePriority`: 100
- `meatInterestPriority`: 45 when no mice; 70 if raw meat is visible in open camp box
- `fireComfortPriority`: 35; +20 if cold/rain/night
- `socialRubPriority`: 20; +35 if target has raw meat
- `idlePriority`: 10
- meat scene cooldown: 20–40 world ticks or equivalent internal time
- successful feeding cooldown: longer than theft cooldown
- shoo cooldown: short, so the cat comes back later but not immediately

## Done definition

The feature is done when a player can notice the cat in camp, see it react to mice/meat/weather/fire, interact through at least `Шуганути` and `Дати сире м’ясо`, and trust that it stays in camp and does not die from ordinary ecology. `Дати сире м’ясо` is done only when it routes through generic `give сире м’ясо коту`, with `/feed_raw_meat` and `/feed_raw_meet` as aliases.
