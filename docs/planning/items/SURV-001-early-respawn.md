---
id: SURV-001
title: Early respawn support
status: testing
type: feature
area: survival
priority: high
tags:
  - onboarding
  - respawn
  - beginner
---

# Early respawn support / Повернення

## Goal

Add `/respawn` as **Повернення** for new or weak characters who get lost.

## Current placeholder

- As of 0.10.6, `/respawn` had a Telegram fallback message explaining that the real respawn flow was still planned.
- 0.13.24 implements the first live return flow as `/respawn`, with confirmation, a short cooldown, action queue interruption, stamina consequence and a world event trail.

## Rules

- Available only before a defined progression threshold, such as early skill/progression totals, starter-phase flags, or another small “not yet established” character measure.
- Returns character to starting location.
- May have cooldown.
- May apply fatigue, hunger or small resource loss.
- Should not become permanent fast travel.
