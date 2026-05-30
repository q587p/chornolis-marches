---
id: LOOP-001-A
title: Starter look/examine output audit
status: next
type: design
area: core-loop
priority: medium
estimate: 1h
tags:
  - look
  - examine
  - starter
depends_on:
  - ONB-001-A
---

# LOOP-001-A: Starter look/examine output audit

## Goal

Audit the first ordinary locations after tutorial.

## First Scope

- Review starter camp, bridge approaches and nearby cells.
- Note thin prose and missing cues.
- Audit visible location features so the location overview and direct feature inspection do not collapse into the same bare line.
- Add missing `examine`/direct-inspection explanation text for the first gate cluster:
  - `Зачинені ворота`: direct `look ворота` and `examine ворота` should not be identical; examination should explain the locked passage and current condition.
  - `Смоляна поставка з факелами`: examination should explain that torches can be taken and how this relates to light/safety.
  - `Дощана записка про звіра`: the feature list needs a short hint, while examination should explain the ecological request and what counts as a contribution.
  - `Падальний рів`: the feature list needs a short hint, while examination should explain what can be put there, that it is not a fixed bounty, and why it matters.
- Check other early visible features for the same two-layer rule: compact `/look` label, richer `/examine` feature text.

## Acceptance

- A concrete list of locations exists.
- Each note has an intended follow-up or no-action decision.
- Gate-cluster features have proposed extra text for `/examine` and direct feature inspection.
- A rule exists in system/map-editing docs that new visible features should include richer inspection text where practical.

## Implementation Order

Do after: `ONB-001-A`.
