# Attack Learning And The 0.16.x Boundary

Date: 12026-06-11
Status: planning-only review

## Decision

Do not add a broad attack/combat system to the remaining `0.16.x` lane.

The project already has a playable attack surface and a canonical attack-learning bridge:

- player and creature attacks can record attack practice progress;
- player `look` can record attack observation from recent local attack sources;
- creature `LOOK` can record attack observation for eligible hunter-like creatures;
- weapon-aware attack/freshening display work is already marked done through `WPN-002`;
- deeper arena/combat observation remains explicitly deferred through `COMBAT-002`.

Therefore the remaining `0.16.x` work should treat attack learning as present but in need of small polish only if live play shows a readability gap.

## What May Fit In 0.16.x

Allowed, if kept narrow and behavior-preserving or near-behavior-preserving:

1. **Attack-learning docs/news cleanup** - document that attack practice and observation already exist, and keep player-facing wording qualitative.
2. **`Навчання` hint refresh** - mention that fighting/seeing a fight can teach without exposing raw progress numbers or creating a public skill sheet.
3. **First-session smoke coverage** - verify that attacking small eligible animals, seeing hunter/predator attacks and using `look` after visible violence do not confuse the player.
4. **Tiny WPN-003 seed slice** - only if a visible hunter-with-spear demonstration is needed for readability. This should seed existing NPC held weapons and update display/action text, not expand combat.
5. **Grammar/case polish** - if combat result text is visibly awkward in Ukrainian, keep it as a text audit, not a combat rewrite.

## What Should Stay Out Of 0.16.x

Defer to post-`0.16.x` or later:

- training arenas;
- sparring loops;
- player-vs-player combat;
- armor, rounds, wounds, dodge/parry, counterattacks;
- broad weapon skills and modifiers;
- group combat assist;
- aggressive defense/counterattack AI;
- public `/skills` or stat-sheet style combat UI.

## Recommended Priority

For `0.16.x`, do **not** prioritize attack-learning implementation ahead of runtime evidence, readiness, first-session smoke or mentorship/tracking polish.

If one more gameplay-adjacent slice is desired before closing `0.16.x`, prefer this order:

1. `QA-002` camp/dream/waking-world smoke.
2. `ONB-012` learning-surface hint refresh, including a small attack-learning mention.
3. Optional WPN-003 if the hunter/spear demonstration is needed for observation readability.
4. Defer `COMBAT-002` training arena until after full combat design.

## Acceptance For A Tiny 0.16.x Attack Polish Slice

A tiny attack-learning polish slice is acceptable only if it can truthfully say:

- no new combat mechanics;
- no expanded target eligibility;
- no schema/migration;
- no action duration or stamina math changes;
- no public raw skill sheet;
- no broad AI changes;
- tests cover the existing attack-learning bridge or player-facing wording.
