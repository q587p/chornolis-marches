---
id: LEARN-007
title: Learning pace and UO-like curve audit
status: backlog
type: tuning
area: learning
priority: high
tags:
  - learning
  - progression
  - skills
  - balance
  - anti-grind
depends_on:
  - LEARN-001-C
  - OBS-001-D
---

# LEARN-007 -- Learning Pace And UO-Like Curve Audit

## Goal

Audit the current learning pace because visible skill growth feels too fast.

Skill growth should still reward use, observation, apprenticeship and meaningful
failure, but it should not let a short repeated loop rush through qualitative
skill stages or spam "skill improved" feedback.

Use Ultima Online as a pacing reference, not as a formula to copy. Useful
reference points from UO-style skill progression:

- skill improves through use of the related action;
- higher ranges slow down sharply compared with early practice;
- difficulty-appropriate actions matter, so trivial actions should not train a
  high skill forever;
- an anti-dry-streak guarantee can exist, but only as a bounded fallback after
  enough valid attempts/time, not as fast guaranteed growth;
- caps or effective ceilings protect character identity and prevent every
  character from becoming equally good at everything.

References:

- https://uo.com/wiki/ultima-online-wiki/skills/
- https://www.uoguide.com/Skills
- https://www.uoguide.com/Guaranteed_Gain_System
- https://www.uoguide.com/Skill_Cap

## Candidate Scope

- Inventory current gain amounts, cooldowns and message frequency for attack,
  gathering, freshening, cooking, herbalism, tracking/following and observation.
- Define pacing bands for the existing qualitative levels: early learning can be
  noticeable, middle progress should take repeated real play, and high skill
  should require many valid, varied or difficult attempts.
- Review whether each skill has a "too easy for your current level" concept:
  repeated trivial actions should give little or no progress once the character
  has outgrown them.
- Review observation gains separately from practice gains, so watching a teacher
  helps but does not become the fastest grind path.
- Add a conservative dry-streak hook only if needed, and only for valid,
  difficulty-appropriate attempts.
- Tune player-facing progress messages so they appear when the change is
  meaningful, not every time a tiny internal progress row changes.

## Guardrails

- Do not expose raw skill numbers, exact gain rates or chance tables to ordinary
  players.
- Do not add a broad public skill sheet.
- Do not turn learning into player rewards, loot, economy, profession unlocks or
  combat-system expansion.
- Do not copy UO formulas directly; Chornolis uses bounded qualitative progress
  and diegetic feedback.
- Avoid Prisma schema or migration changes unless a later implementation proves
  they are truly needed.
- Preserve existing command behavior unless a focused implementation PR changes
  one skill's pacing with tests.

## Acceptance

- A source-level audit lists current gain call sites and identifies the fastest
  short loops.
- A small shared pacing policy exists for at least practice vs observation,
  low/mid/high qualitative ranges and difficulty mismatch.
- Tests cover bounded gain, high-skill slowdown, observation cooldown/limits and
  no public raw-number UI.
- "Skill improved" style messages are rate-limited or thresholded enough that a
  short spam loop does not flood chat.
- Documentation in `docs/systems/progression.md` or a nearby system doc explains
  the intended pacing in qualitative terms.

## Notes

This is a future tuning/design slice. It should not change learning behavior in
the PR that only records this task.
