---
id: TRACK-LEARN-001
title: Following as a learned skill
status: backlog
type: feature
area: progression
priority: medium
tags:
  - skills
  - following
  - tracking
  - darkness
  - movement
depends_on:
  - PROG-002
---

# TRACK-LEARN-001 -- Following as a Learned Skill

## Goal

Turn repeated attentive following into a bounded skill path instead of only a helper toggle.

The player-facing name should be `Слідування`. Keep `follow_assist` as the technical command/state name for compatibility unless a later migration deliberately renames it.

## Candidate Behavior

- Practicing ordinary visible following can slowly improve `Слідування`.
- Following a person, animal or mentor should count only when the player is actually keeping attention on a plausible trace or visible movement.
- Higher skill can reduce failure from darkness, vague direction, low visibility or stale traces.
- Very high skill may preserve enough direction from a dim or briefly lost trace to offer a qualitative "you can still read this" outcome.
- Higher skill can eventually make simple posture recovery smoother: if the player is only sitting or lying, слідування may first stand them up before an ordinary visible catch-up step.

## Guardrails

- Do not make this an auto-navigation or group-movement rewrite.
- Do not bypass hidden-route restrictions just because following skill is high.
- Do not expose raw skill numbers in ordinary player UI.
- Keep bounded gains and qualitative feedback.
- Do not let automatic standing bypass sleep, incapacity, hidden routes, stamina limits or action queue rules.
- Preserve `/follow_assist_on` / `/follow_assist_off` compatibility.

## Acceptance

- `Слідування` exists as a real skill/progression key or mapped learning context.
- Repeated valid following attempts can improve it through the shared learning/progression layer.
- Darkness/visibility failure has a bounded skill-aware modifier without becoming guaranteed.
- High-skill posture recovery can stand from sitting/lying only when the follow step itself would otherwise be legal.
- Tests cover low-skill failure, higher-skill improvement, hidden-route guardrails and no public raw numbers.
