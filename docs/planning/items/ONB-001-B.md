---
id: ONB-001-B
title: Hint after first Озирнутися
status: done
type: ux
area: onboarding
priority: high
estimate: 1h
tags:
  - tutorial
  - look
  - copy
depends_on:
  - ONB-001-A
---

# ONB-001-B: Hint after first Озирнутися

## Goal

Guide the player from first look toward closer examination.

## First Scope

- Add one atmospheric hint after first tutorial look.
- Point toward `Роздивитися` without sounding like a checklist.

## Acceptance

- Hint appears once or is safely repeatable.
- Player understands the next action.
- No spam in ordinary locations.

## 0.14.8 Result

- First tutorial `Озирнутися` now gets a one-time Дрімота hint that look gives orientation and closer attention can follow.
- The hint is stored separately from the keyboard-progress marker, so it does not spam or change ordinary waking locations.

## Implementation Order

Done after: `ONB-001-A`.
