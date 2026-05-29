---
id: OBS-001-D
title: Observation anti-farming cooldown
status: next
type: feature
area: learning
priority: medium
estimate: 1h
tags:
  - observe
  - cooldown
  - anti-grind
depends_on:
  - OBS-001-C
---

# OBS-001-D: Observation anti-farming cooldown

## Goal

Prevent repeated progress from the same event.

## First Scope

- Track recent observation source or cooldown.
- Return flavor text when nothing new is learned.

## Acceptance

- Same observed event cannot be farmed.
- Cooldown text is clear and atmospheric.

## Implementation Order

Do after: `OBS-001-C`.
