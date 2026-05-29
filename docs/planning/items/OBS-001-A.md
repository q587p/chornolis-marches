---
id: OBS-001-A
title: Observe action and alias skeleton
status: next
type: feature
area: learning
priority: high
estimate: 1-2h
tags:
  - observe
  - aliases
  - targets
depends_on:
  - LEARN-001-C
  - VIS-001-C
---

# OBS-001-A: Observe action and alias skeleton

## Goal

Add a narrow `Спостерігати` action that can target visible beings.

## First Scope

- Add command/alias skeleton.
- Resolve visible target by number/name where practical.
- Return a simple observation message.

## Acceptance

- `спостерігати` works.
- Hidden targets cannot be observed directly.
- No learning yet required.

## Implementation Order

Do after: `LEARN-001-C`, `VIS-001-C`.
