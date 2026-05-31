---
id: VIS-001-F
title: Darkness copy audit
status: testing
type: content
area: visibility
priority: medium
estimate: 1-2h
tags:
  - visibility
  - night
  - copy
  - atmosphere
  - ukrainian
---

# VIS-001-F: Darkness Copy Audit

## Goal

Ensure darkness feels atmospheric and diegetic, not like a technical visibility flag.

When night hides or reduces information, the player-facing text should explain uncertainty in the world voice.

## Scope

Audit and add copy variants for cases where darkness affects:

- location description details;
- visible nearby beings;
- tracks/signs;
- loose ground objects;
- feature interaction hints;
- failed target lookup because the target may be hidden by darkness.

## Copy Direction

Prefer:

- `У темряві ви не розрізняєте дрібних слідів.`
- `Щось може бути поруч, але без світла важко сказати напевно.`
- `На землі щось темніє, та без вогню не розібрати.`
- `Світло вихоплює з темряви кілька знайомих рис.`

Avoid:

- `hidden by visibility service`;
- `target not visible due to night state`;
- raw debug booleans in player text.

## Out of Scope

- Implementing the visibility service itself.
- Stealth.
- Hidden follower spirits.
- Observation-learning rules.

## Acceptance

- Darkness reductions have player-facing Ukrainian copy.
- Scribe/debug views may show technical detail, but ordinary text remains diegetic.
- Copy distinguishes “not present” from “not clearly visible” where practical.
- Tests or snapshots cover at least one representative hidden/reduced detail path if cheap.

## 0.14.5 Slice

- Added shared darkness copy helpers for obscured location description, nearby presence, tracks, ground objects and resources.
- Added focused helper assertions covering representative darkness copy.
- Broader copy audit for feature-specific hints and hidden target lookup remains future work.
