---
id: FIRE-002
title: Magical campfire examine layer
status: proposed
type: content
area: survival
priority: medium
estimate: 2-4h
tags:
  - fire
  - campfire
  - examine
  - light
  - atmosphere
depends_on:
  - QUOTE-001
---

# FIRE-002: Magical Campfire Examine Layer

## Goal

Give magical or old seeded campfires a rare deeper `Роздивитися` layer that treats fire as a liminal boundary, while ordinary campfires remain practical survival tools.

## Scope

- Add copy only for magical, old seeded, ritual or authored omen campfires.
- Keep ordinary player-made/debug campfires focused on fuel, light, warmth, fading and ash.
- Put the strange layer in `examine`, not routine `look`.
- Use existing feature data or tags if possible; avoid schema changes for the first pass.
- Rate-limit or make it one-time per feature/player if current systems support that cheaply.

## Candidate copy

`Озирнутися`:

```text
Вогнище горить рівно, майже без тріску.
```

`Роздивитися`:

```text
Полум'я тримається без хмизу.
Воно дає світло, але тіні навколо нього не поспішають відступати.
```

Rare deeper layer:

```text
Багаття показує не лише тих, хто сидить біля нього.
На мить здається, що за межами світла хтось теж гріє руки.
```

## Out of scope

- New fire mechanics.
- Full ritual system.
- Hidden follower spirit implementation.
- Changing ordinary campfire timers or fuel rules.

## Acceptance

- Ordinary campfire `look`/`examine` behavior remains practical and understandable.
- Magical/old campfire examine has one distinct atmospheric layer.
- The line does not become noisy in local chat.
- Existing campfire tests still pass.

## Suggested validation

- `node scripts/test/campfire-decay.cjs`
- `npm test`
- `npm run build`
