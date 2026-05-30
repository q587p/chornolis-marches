---
id: SLEEP-001
title: Lying posture and lie command
status: next
type: feature
area: survival
priority: high
estimate: 1-2h
tags:
  - sleep
  - posture
  - aliases
  - rest
depends_on: []
---

# SLEEP-001: Lying posture and lie command

## Goal

Add `LYING` as a real posture, separate from sitting, active rest and sleep.

## First Scope

- Extend posture rules from `STANDING | SITTING` to `STANDING | SITTING | LYING`.
- Add `/lie` plus Ukrainian aliases `лягти` and `лежати`.
- Let an awake lying character sit up with `/sit` / `сісти`.
- Let an awake lying character stand directly with `/stand` / `встати`.
- Reuse the existing physical-action posture guard so lying blocks movement, pickup, gathering, attacking, cooking, fire/torch handling and similar physical actions.
- Keep non-physical actions available while lying: look, examine, speech, reply and status/queue checks.

## Acceptance

- `/lie` changes only posture; it does not start sleep or rest.
- Actor text says `Ви лежите.` or equivalent.
- Observer/local text can say `{name} лежить.` where local observer messages are already supported.
- `/sit` from lying changes posture to sitting.
- `/stand` from lying changes posture to standing.
- Physical actions while lying show a clear stand-up prompt and do not bypass posture rules.
- Existing sitting/rest behavior remains unchanged.

## Implementation Order

Do before `SLEEP-002`.
