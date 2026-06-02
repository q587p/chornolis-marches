---
id: ONB-008
title: Owl threshold refrain in the dream
status: proposed
type: content
area: onboarding
priority: medium
estimate: 2-4h
tags:
  - onboarding
  - dream
  - owl
  - examine
  - atmosphere
depends_on:
  - ONB-006
  - QUOTE-001
---

# ONB-008: Owl Threshold Refrain in the Dream

## Goal

Place the direct owl refrain at the dream/waking threshold as an optional inspectable moment, so it feels like the first crack in reality rather than normal camp flavor text.

## Placement

Preferred: near `Край пробудження` or the current tutorial dream exit surface after the look/examine ladder.

Do not put the direct quote in ordinary starter-camp description.

## Scope

- Add one inspectable dream feature: old root, pine, bark mark, dry branch, owl shadow or half-seen carved sign.
- `Озирнутися` should keep orientation short.
- `Роздивитися` should reveal the direct line:

```text
«Сови не ті, ким здаються».
```

- Optional lower/smaller line:

```text
«І не всі написи лишають люди».
```

- Keep the moment optional; do not block tutorial completion.
- Store one-time per-character exposure if current tutorial flags make that cheap. Otherwise, keep it as an inspectable feature without extra persistence.

## Out of scope

- New dream mechanics.
- New owl creature behavior.
- Explaining the quote.
- Repeating the direct quote after waking.

## Acceptance

- A player can complete the tutorial without seeing the line.
- A player who examines the threshold feature sees the direct quote once or in one stable place.
- The starter camp remains a practical waking anchor, not a direct quote billboard.
- Existing tutorial look/examine tests still pass.

## Suggested validation

- `node scripts/test/tutorial-voices.cjs`
- `npm test`
- `npm run build`
