---
id: SURV-001-B
title: /respawn command skeleton
status: testing
type: feature
area: survival
priority: high
estimate: 1h
tags:
  - respawn
  - telegram
  - command
depends_on:
  - SURV-001-A
---

# SURV-001-B: /respawn command skeleton

## Goal

Add the command entry point before moving characters.

## First Scope

- Register `/respawn`.
- Return eligible/ineligible/no-character responses.
- Do not move the player yet.

## Acceptance

- Command exists.
- Responses are clear.
- No movement occurs in this slice.

## Implementation Order

Do after: `SURV-001-A`.

## 0.13.24 Notes

- `/respawn` is now the primary command.
- The command opens a confirmation flow instead of moving immediately.
