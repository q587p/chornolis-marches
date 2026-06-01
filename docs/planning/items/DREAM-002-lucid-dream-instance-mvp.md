---
id: DREAM-002
title: Lucid dream instance MVP
status: backlog
type: feature
area: dreams
priority: medium
estimate: 2-4h
tags:
  - dreams
  - lucid-dreams
  - instances
  - groups
  - quests
depends_on:
  - DREAM-001
---

# DREAM-002: Lucid dream instance MVP

## Goal

Create a small reusable dream-instance model that can support tutorial dreams first and later solo/group lucid dreams.

## First Scope

- Add a `DreamInstance` concept with kind, state, participants, dream location and entry reason.
- Treat tutorial dream as one dream kind, not the whole dream system.
- Allow a solo lucid dream instance to place a dream presence in a dream location.
- Leave group dreams as a prepared extension unless `Гурт` foundations are ready.
- Define how one participant wakes without breaking the whole instance.

## Acceptance

- The tutorial dream can be represented as a dream instance.
- Future dream kinds can be added without copying onboarding-specific logic.
- A dream instance can end cleanly and return awareness to the waking body.
- Waking one participant has an explicit rule.
- No broad group-dream gameplay is pulled into the MVP.

## Implementation Order

Do after `DREAM-001`. Keep advanced place-spirit and ritual dream behavior for `DREAM-004`.
