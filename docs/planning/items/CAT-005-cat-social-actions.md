---
id: CAT-005
title: Cat social gestures: shoo, wave off, rub against, circle around
status: next
type: feature
area: social
priority: medium
tags:
  - cat
  - social
  - signals
  - telegram
  - actions
  - give
---

# CAT-005 — Cat social gestures

## Summary

Add or reuse small social/gesture actions for the cat and future nonverbal NPCs: shoo, wave off, rub against and circle around.

Do not implement `FEED_RAW_MEAT` as a social action. Feeding is an inventory transfer and should route through `GIVE-001` / generic `give`.

## Scope

- Add `SHOO` / `Шуганути` if not already available.
- Add `WAVE_OFF` / `Замахати руками` as a softer gesture if not already available.
- Add `RUB_AGAINST` / `Ластитися` as a creature-to-target social action.
- Add `CIRCLE_AROUND` / `Ходити колом довкола` as a generalized social/flavor action if cheap.
- Let `RUB_AGAINST` expose a `Дати сире м’ясо` affordance when `GIVE-001` is available and the player has valid raw meat.
- Wire buttons/aliases into target interaction keyboard without crowding ordinary combat controls.
- Ensure all player-facing copy is Ukrainian and diegetic.

## Out of scope

- Standalone `FEED_RAW_MEAT` action type.
- Item transfer semantics; those belong to `GIVE-001`.
- Full friendship/trust score.
- Petting/taming ownership.
- Group-follow system.
- Dialogue replies.

## Acceptance criteria

- A player can shoo or wave off the cat during a meat scene.
- Shoo/wave cancels meat theft and triggers flee-down/away behavior.
- The cat can ластитися to someone, especially someone carrying raw meat.
- If `give` is implemented, ластитися / meat-interest UI can offer `Дати сире м’ясо`, but the handler routes to `give`.
- Circle-around action works for at least one target type or is deferred with a clear note.
- Input aliases and button labels are covered by tests/docs if this project requires command coverage.

## Suggested validation

- `node scripts/test/input-aliases.cjs`.
- `node scripts/test/slashless-command-coverage.cjs` if aliases are slashless.
- `node scripts/test/reply-targets.cjs` or target interaction tests.
- New `node scripts/test/camp-cat.cjs`.
- `npm test`.
