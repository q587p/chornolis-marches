---
id: TRACK-LEARN-001-D
title: Mentor guided tracking prompt
status: testing
type: feature
area: mentorship
priority: medium
estimate: 1h
tags:
  - mentorship
  - tracking
  - following
  - learning
depends_on:
  - TRACK-LEARN-001-C
---

# TRACK-LEARN-001-D: Mentor Guided Tracking Prompt

## Goal

Add one bounded guided tracking-practice prompt for active mentorship without implementing the full `Слідування` skill.

The prompt should appear only after an existing route-memory/tracking-learning moment already proves that the player is actively following or reading a mentor's trail.

## Scope

- Reuse the existing mentorship lesson and practice-prompt marker/cooldown infrastructure.
- Gate the prompt on active tracking mentorship plus the existing `mentorship_followed_movement` context.
- Keep text compact, diegetic and qualitative.
- Offer only an existing safe action affordance such as `Сліди` / `/track`.

## Boundaries

- No full `TRACK-LEARN-001` implementation.
- No new `Слідування` skill effects.
- No follow-assist behavior changes, auto-navigation, hidden-route bypass, darkness bypass, group movement or automatic standing.
- No new commands, combat changes, animal AI changes, scheduler/runtime tuning, action queue/recovery/Telegram/Prisma tuning, schema changes or migrations.
- No public raw skill/progress UI.

## Acceptance

- Active mentorship plus a valid tracking route-memory learning context can create the prompt.
- Inactive mentorship, unsupported context and repeated attempts within cooldown do not create prompt spam.
- Prompt copy avoids raw progress, XP, hidden-route, group-movement and public skill-sheet language.

## 0.16.36 Testing Note

- Added a tracking-specific mentorship practice prompt for the existing clear followed-movement lesson context.
- The prompt reuses `Mentorship practice prompt` markers and points to the existing `Сліди` action.
- Full following-skill behavior remains future work in `TRACK-LEARN-001`.
