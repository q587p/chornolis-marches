---
id: GATHER-001
title: Low-light foraging penalty warning
status: backlog
type: feature
area: gathering
priority: medium
estimate: 1-2h
tags:
  - gathering
  - visibility
  - light
  - skills
  - beginner-safety
depends_on:
  - VIS-001-A
  - WORLD-001-F
---

# GATHER-001: Low-light Foraging Penalty Warning

## Goal

Make gathering/searching in poor light feel fair: warn the player that searching without light is heavily penalized, but still allow the attempt.

This came from a twilight/riverbank case where `/gather` spent time and stamina, found nothing, and only then suggested trying again. The player should be able to infer that lack of light matters before repeating the same expensive action.

## First Scope

- Apply to ordinary `/gather`, `/gather <resource>` and Ukrainian search/gather aliases that use the same gather action path.
- Use the existing light/visibility snapshot rather than adding a new schema field.
- In dim/dark conditions without active local/carried light, show a short atmospheric warning before or with the gather attempt:
  - searching is still possible;
  - without light, small useful things are much easier to miss;
  - a torch, fire or better light would help.
- Keep the action allowed. Do not turn darkness into a hard refusal.
- Reduce the penalty as the relevant gathering/foraging skill improves:
  - beginner/low skill: strong penalty;
  - practiced characters: smaller penalty;
  - high skill: still affected by darkness, but less punishing.
- Keep player-facing text qualitative. Do not expose raw chance numbers.

## Acceptance

- A low-light gather/search attempt without active light gives a clear warning before the player is encouraged to repeat it.
- The attempt can still be queued/completed and can still succeed.
- Skill/learning level reduces the low-light penalty in bounded qualitative steps.
- The same warning path does not trigger in adequate daylight or when the player/location has active light.
- Tests cover:
  - warning shown in poor light without light;
  - no warning in adequate light;
  - no hard block;
  - higher skill reduces the penalty;
  - no raw percentage/chance text appears in player-facing copy.

## Out Of Scope

- No broad gather rewrite.
- No new resources or ecology spread.
- No new light sources.
- No public skill-number UI.
- No Prisma schema or migration changes.
