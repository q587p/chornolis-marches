---
id: SURV-001-C
title: Повернення confirmation and aliases
status: testing
type: feature
area: survival
priority: high
estimate: 1-2h
tags:
  - respawn
  - aliases
  - button-parity
depends_on:
  - SURV-001-B
---

# SURV-001-C: Повернення confirmation and aliases

## Goal

Add a confirmation step and Ukrainian text aliases.

## First Scope

- Add confirmation button/callback.
- Add aliases such as `повернення` and `повернутися`.
- Keep slash command compatible.

## Acceptance

- No accidental return without confirmation.
- Aliases route to the same flow.
- Button parity rule is preserved.

## Implementation Order

Do after: `SURV-001-B`.

## 0.13.24 Notes

- Added confirmation buttons for `/refresh` before any movement happens.
- Added text aliases `повернення`, `повернення до табору`, `повернутися до табору`, `вернутися до табору`, and `назад до табору`.
- Kept plain `повернутися` as the local Back action to avoid surprising players who only mean to return to the previous view.
