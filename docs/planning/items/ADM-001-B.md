---
id: ADM-001-B
title: Scribe action audit helper
status: next
type: technical
area: admin
priority: medium
estimate: 1-2h
tags:
  - admin
  - audit
  - world-events
depends_on:
  - ADM-001-A
---

# ADM-001-B: Scribe action audit helper

## Goal

Add a small helper and cover the first dangerous command.

## First Scope

- Create helper such as `logScribeAction`.
- Write to world event or equivalent.
- Apply to `/reset` or another high-risk command.

## Acceptance

- One dangerous command writes who/what/when.
- Helper is reusable.
- No player-facing spam.

## Implementation Order

Do after: `ADM-001-A`.
