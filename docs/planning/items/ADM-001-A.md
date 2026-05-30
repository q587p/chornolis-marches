---
id: ADM-001-A
title: Dangerous scribe tool audit
status: done
type: technical
area: admin
priority: medium
estimate: 1h
tags:
  - admin
  - audit
  - safety
depends_on: []
---

# ADM-001-A: Dangerous scribe tool audit

## Goal

List dangerous commands that should leave an audit trail.

## First Scope

- Find reset/tick/cleanup/add/debug tools.
- Record current access checks and missing logs.

## Acceptance

- List exists: `docs/systems/scribe_audit.md`.
- First command to cover is selected: `/reset`.
- Behavior change is intentionally limited to writing an internal audit event.

## Implementation Order

Can be done independently.

## Result

0.13.18 documents the dangerous scribe/admin tool list and selects `/reset` as the first command covered by the shared audit helper.
