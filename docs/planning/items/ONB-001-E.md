---
id: ONB-001-E
title: Wake and return fallback polish
status: next
type: ux
area: onboarding
priority: medium
estimate: 1h
tags:
  - tutorial
  - sleep
  - wake
  - aliases
depends_on:
  - ONB-001-D
---

# ONB-001-E: Wake and return fallback polish

## Goal

Prevent tutorial sleep/wake aliases from becoming dead ends.

## First Scope

- Review `/sleep tutorial`, `/wake`, `сон`, `прокинутися` aliases.
- Improve fallback text where needed.

## Acceptance

- Player can leave tutorial.
- Player can return while tutorial is active.
- Fallback points to useful commands.

## Implementation Order

Do after: `ONB-001-D`.
