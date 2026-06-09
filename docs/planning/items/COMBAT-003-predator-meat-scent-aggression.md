---
id: COMBAT-003
title: Predator raw-meat scent aggression
status: icebox
type: feature
area: combat
priority: medium
tags:
  - animals
  - combat
  - predators
  - survival
  - inventory
depends_on:
  - COMBAT-001
---

# COMBAT-003: Predator Raw-Meat Scent Aggression

## Goal

After creature-vs-player combat has real defensive choices, let hungry predators treat carried raw meat as a small situational risk.

The first motivating case is a hungry wolf: if a player is nearby and carries `raw_meat`, the wolf may become more likely to stalk, threaten, or attack. Owls and hawks can later use the same narrow idea for their own scale and daypart rules instead of sharing one generic predator script.

## Direction

- Keep this blocked until `COMBAT-001` gives players meaningful defense, escape, injury/knockout and readable danger pacing.
- Use `raw_meat` as a risk signal, not a guaranteed aggro switch.
- Wolves:
  - strongest candidate for direct hunger pressure;
  - may escalate from watching/growling/tracking to attack when hungry enough and the situation is viable;
  - should be less likely to engage near strong fire, crowds, guards, or safer starter boundaries.
- Owls:
  - only under owl-appropriate daypart behavior;
  - should stay smaller and more opportunistic than wolves;
  - can react to raw meat as scent/interest, but should not become a routine daytime attacker.
- Hawks:
  - daytime-only pressure;
  - should feel like a quick strike or circling threat, not wolf-style pursuit.
- The player-facing text should imply hunger, scent, attention and risk without exposing raw thresholds.

## Guardrails

- Do not implement before combat foundations are live.
- Do not make raw meat unusable or punitive by default; this should be a situational wilderness risk.
- Do not turn this into a theft/economy system, loot table, profession loop, quest, or public skill-number feature.
- Do not make starter camp/fire/watchtower safety collapse without a separate beginner-safety review.
- Do not change owl/hawk ecology, daypart behavior or fauna seed data as part of this task.

## Acceptance Notes

- A hungry wolf with a nearby player carrying `raw_meat` can select a guarded aggression/attack path only when combat rules allow it.
- The same player without `raw_meat` should not receive this specific meat-scent pressure.
- Owls and hawks have separate species/daypart gates; they do not inherit wolf behavior wholesale.
- Player-facing warning and attack copy stays atmospheric and readable.
- Tests cover:
  - wolf raw-meat eligibility;
  - no raw-meat no-op/low-risk path;
  - owl and hawk daypart/species guardrails;
  - no behavior change before combat prerequisites are enabled.

## Open Questions

- Should cooked meat also attract predators, or should the first pass be `raw_meat` only?
- Should meat stored in future containers/cache be safer than meat carried openly?
- How should firelight, group presence and loud nearby events reduce or reshape the risk?
