---
id: WORLD-001-E
title: World-time debug and admin safety
status: next
type: technical
area: world_time
priority: medium
estimate: 1-2h
tags:
  - world-time
  - day-night
  - admin
  - debug
  - testing
---

# WORLD-001-E: World-Time Debug and Admin Safety

## Goal

Make the first day/night implementation testable without waiting for real time or editing the database manually.

This is a support slice for `WORLD-001`, not a separate player-facing system.

## Scope

Provide a minimal safe way for scribes/developers to inspect and, in non-production or scribe-only context, adjust world-time/daypart state.

Possible tools:

- read current world time/daypart in technical output;
- set or advance world time in a controlled debug/admin command;
- show exact technical values only to scribes/debug users;
- keep player-facing `/time` atmospheric and non-technical.

## Out of Scope

- Calendar, moon phases or named years.
- Seasons.
- Weather.
- Full sleep auto-wake scheduling.
- Hidden presence or stealth.

## Acceptance

- Testers can force or inspect dawn/day/dusk/night for QA.
- Ordinary players do not see raw debug numbers by default.
- Any dangerous state-changing command is scribe-gated and documented in admin docs.
- The tool does not bypass core world-time helpers.

## Validation

- Focused helper/command tests if the implementation adds parsing or state-changing logic.
- Manual check for each daypart.
