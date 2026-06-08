---
id: LEARN-006
title: High-skill quality and rare finds
status: testing
type: feature
area: learning
priority: medium
tags:
  - learning
  - quality
  - rare-finds
  - freshening
  - gathering
depends_on:
  - LEARN-003
  - LEARN-004
---

# LEARN-006 — High-Skill Quality And Rare Finds

## Goal

Let higher skill levels unlock occasional qualitative outcomes, not only faster actions, lower costs or higher success chances.

## Direction

At higher bounded skill levels, a successful action may sometimes produce a special result that fits the action and region:

- freshening may produce a cleaner or better cut such as a fine piece of meat;
- gathering may find an especially useful medicinal herb, seed, mushroom or prepared-looking bundle;
- careful searching while gathering or freshening may rarely uncover a tiny incidental find such as one `шаг`;
- fishing, foraging, crafting or future professions may later use the same pattern for action-specific quality.

The result should feel like skilled attention finding something that was plausibly there, not like a generic loot table bolted onto every action.

## Guardrails

- Do not add this to the first freshening effect slice; `0.15.38` stays chance-only and yield-neutral.
- Do not make rare finds frequent enough to become an economy loop.
- Do not hide essential survival items behind high skill.
- Do not show raw levels, roll chances or formulas to ordinary players.
- Do not make every high-skill action produce more quantity; prefer occasional quality, softer failure, special text or tiny side finds.
- Coin finds should remain very small, usually `шаг`, and should respect money/loot balance rules.

## Candidate Outcomes

- `fine_raw_meat` or a quality-marked meat result once food quality/item-state design is ready.
- Special medicinal herbs or identified herb bundles for high gathering/herbalism.
- A one-`шаг` incidental find from careful handling, limited by cooldown and region/source caps.
- Better failure text or partial salvage instead of pure deletion for some food/crafting actions.

## Acceptance Notes

- At least one high-skill action can produce a rare qualitative result.
- The effect is bounded, tested and cooldown/cap-safe.
- Ordinary players see atmospheric outcome text, not raw skill math.
- Economy-facing rewards stay tiny and cannot be farmed reliably.

## Implementation Notes

`0.15.45` implements the first MVP slice:

- high gathering can rarely notice one extra ordinary unit of the same supported
  resource already being gathered (`herbs`, `berries` or `mushrooms`);
- high freshening can rarely add a cleaner-work qualitative note without
  changing meat yield;
- tutorial foraging, unsupported resources, combat, cooking quality, money finds
  and broad loot tables remain out of scope.

The outcome chance uses learning already stored before the current action. The
practice recorded by that action only affects future attempts.
