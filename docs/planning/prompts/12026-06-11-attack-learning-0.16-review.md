# Prompt Archive: Attack Learning And 0.16.x Boundary

Date: 12026-06-11
Status: planning prompt archive
Related docs:

- `docs/planning/attack-learning-0.16-review.md`
- `docs/planning/next.md`
- `docs/planning/runtime-heartbeats-and-0.17.md`

## Source Question

The user asked whether attack and learning attack should still be added in `0.16.x`, or whether it already exists, and whether any other tasks should be planned specifically for `0.16.x`.

## Summary Answer

Attack and attack learning already exist in the current codebase as a minimal MVP:

- player/creature attack completions record canonical attack practice;
- recent local attack sources can be observed by players through `look`;
- eligible hunter-like creatures can learn by observing recent attack sources;
- weapon-aware attack text/freshening work is already done in `WPN-002`;
- training arena and broad combat observation are deferred.

The recommended `0.16.x` action is planning/docs polish, not a new combat system.

## Prompt A - Docs-Only Attack Learning Review

```text
Update planning docs only.

Goal: record that attack and attack-learning MVP already exists and should not become a broad 0.16.x combat lane.

Scope:
- add docs/planning/attack-learning-0.16-review.md;
- update docs/planning/next.md with a short attack-learning boundary note;
- update docs/planning/prompts/ with this prompt archive;
- optionally mention that COMBAT-002 training arena remains deferred.

Guardrails:
- docs/planning only;
- no src changes;
- no schema/migrations;
- no combat mechanics;
- no target eligibility changes;
- no action duration/stamina math changes;
- no public raw skill sheet.
```

## Prompt B - Tiny 0.16.x Attack Learning Hint Polish

Use only if the project decides one more player-facing `0.16.x` polish slice is worth it.

```text
Implement a tiny attack-learning hint polish slice.

Goal: make existing attack-learning discoverability clearer without changing combat mechanics.

Allowed:
- update the repeatable learning/help surface to qualitatively mention that fighting and witnessing nearby fights can teach;
- add or adjust tests around the help text;
- optionally update release notes/news.

Forbidden:
- no new combat mechanics;
- no sparring or arena;
- no PvP;
- no armor/wounds/rounds/counterattacks;
- no new public skill sheet;
- no Prisma schema or migrations;
- no queue cadence or runtime scheduler changes.
```

## Prompt C - Optional WPN-003 Seed Slice

```text
Implement WPN-003 only if the live game needs a visible hunter-with-spear demonstration for attack observation readability.

Keep it as authored seed/display polish:
- seed existing hunter/herbalist NPC weapons/tools;
- show held weapons/tools in existing visible descriptions;
- let hunter attack observer text mention the spear if already equipped.

Do not add NPC gear AI, loot tables, weapon swapping, training arenas, PvP, full combat or weapon skills.
```
