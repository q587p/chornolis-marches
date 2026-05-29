---
id: OBS-001-C
title: Herbalism/gathering progress from observation
status: next
type: feature
area: learning
priority: high
estimate: 1-2h
tags:
  - observe
  - herbalism
  - progression
depends_on:
  - OBS-001-B
  - LEARN-001-C
---

# OBS-001-C: Herbalism/gathering progress from observation

## Goal

Grant the first diegetic learning hint from observation.

## First Scope

- If player observes the relevant recent herbalist action, grant small progress.
- Show atmospheric learning text.

## Acceptance

- Progress is persisted or event-recorded.
- Player sees no raw numbers.
- Action cannot be spammed endlessly.

## Implementation Order

Do after: `OBS-001-B`, `LEARN-001-C`.
