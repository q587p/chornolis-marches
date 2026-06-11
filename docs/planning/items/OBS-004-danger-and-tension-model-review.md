---
id: OBS-004
title: Danger and tension model review
status: backlog
type: tuning
area: observation
priority: high
tags:
  - observe
  - danger
  - ecology
  - technical-details
  - tuning
depends_on:
  - OBS-003
---

# OBS-004: Danger And Tension Model Review

## Goal

Review and rework how base location danger and temporary local tension combine.

The current mechanics can be valid while still feeling confusing: a safe-looking
base location can temporarily behave as dangerous after recent attacks, crowding
or nearby pressure. Animals already react to this effective danger, but the
model needs clearer naming, boundaries and player/admin feedback.

## Candidate Scope

- Inventory every caller of base `dangerLevel`, `effectiveLocationDanger`,
  recent-attack pressure and crowd pressure.
- Decide whether `danger`, `tension`, `pressure` and `threat` should be distinct
  concepts or one shared effective-danger helper with named sources.
- Review tuning values for recent attacks and crowding so small starter scenes do
  not feel randomly overcharged.
- Keep ordinary player-facing output qualitative and diegetic, especially in
  `/examine`.
- Keep exact raw numbers in technical/scribe/admin surfaces, but make them clear:
  base danger, temporary tension bonus, source and effective/current value.
- Decide whether temporary tension should decay by feature expiry, world ticks,
  calm creature behavior or another explicit rule.

## Guardrails

- Do not introduce a full combat/fear/scent system in this task.
- Do not expose raw danger formulas in ordinary player UI.
- Do not retune animal ecology broadly without focused evidence and tests.
- Preserve existing observation cues unless a follow-up implementation replaces
  them deliberately.

## Acceptance

- A short design note or system doc defines base danger vs temporary tension and
  names the canonical helper/API.
- Existing callers use the canonical helper or explicitly document why they need
  base danger only.
- Technical detail output distinguishes base danger from current/effective
  tension.
- Focused tests cover at least base-only danger, recent-attack tension, crowd
  tension and mixed-source effective danger.
- Any tuning changes include rollback notes and do not silently widen combat,
  group movement or scheduler behavior.

## Notes

This item follows the `0.16.34` polish fix that made the technical location
block show base danger and temporary tension separately. That fix improves
readability; this item exists because the underlying model still deserves a
proper review.
