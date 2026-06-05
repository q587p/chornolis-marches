---
id: LEARN-002
title: Skill effects on stamina, success and quality
status: in_progress
type: feature
area: learning
priority: high
estimate: 2-4h
tags:
  - learning
  - skills
  - stamina
  - success
  - balance
depends_on:
  - LEARN-001-C
---

# LEARN-002: Skill Effects On Stamina, Success And Quality

## Goal

Make early skill growth matter mechanically, not only as flavor text.

Current feedback shows the gap clearly: players see skill-growth messages, but full stamina can still disappear after a small loop such as `examine` -> attack -> freshen repeated a few times. The first real skill effect pass should answer the player question:

> What does improving a skill do?

The preferred answer is: better skill can improve success chance, reduce stamina waste, improve result quality/yield, or soften failure consequences, depending on the action.

## First Scope

- `0.15.23` implements the first narrow slice: herbs, berries and mushrooms
  gathering progress can slightly improve matching success chance and reduce
  stamina cost, with caps and a hard stamina floor. This item remains open for
  attack, freshening, cooking, tracking and broader tuning.
- `0.15.38` implements the first freshening slice: personal practice and
  observation can both contribute canonical `freshening` progress, and ordinary
  player freshening can receive a small bounded success-chance improvement.
  Meat yield, corpse decay, attack effects and public `/skills` UI remain
  deferred.
- Define small, bounded skill-effect rules for the first few repeated actions:
  - attack / hunting or combat;
  - freshening / butchering;
  - gathering / herbalism;
  - cooking;
  - attentive inspection / observation where appropriate.
- Apply skills conservatively:
  - lower stamina cost by a small bounded amount for familiar actions;
  - improve success chance for chance-based actions;
  - improve yield or quality where the action already has variable output;
  - reduce hard waste on some failures later, if the action design allows it.
- Keep raw numeric skill and exact modifiers hidden from ordinary player-facing text.
- Show only diegetic hints such as:
  - `Рух виходить певнішим, і сил іде трохи менше.`
  - `Руки краще пам'ятають, де різати.`
  - `Ви вже швидше відрізняєте корисне від пустого.`
- Keep debug/scribe output able to show exact values once `LEARN-001-D` defines the surface.

## Non-Goals

- No broad skill sheet in the first slice.
- No character levels.
- No large combat rebalance hidden inside the learning task.
- No permanent unbounded stamina discount.
- No exact player-facing formulas.

## Suggested First Effects

These are starting points, not final balance:

- **Attack / Hunting:** skill improves hit chance or reduces miss frequency before it reduces damage costs.
- **Freshening / Butchering:** the first implemented effect improves success chance only. Later slices may consider softer failure consequences or stamina tuning, but meat yield should not increase until the food economy is ready.
- **Gathering / Herbalism:** skill improves chance to find something useful and can slightly reduce stamina spent on failed searches.
- **Cooking:** skill improves the chance that raw meat becomes cooked meat instead of being wasted.
- **Observation / Attention:** skill can make `/examine` reveal danger, tracks, hidden hints or useful context more reliably before it reduces stamina cost.

## Acceptance

- A concrete first skill-effect table exists for at least attack, freshening and gathering.
- At least one implemented skill can affect either success chance or stamina cost.
- Effects are capped and cannot make actions free or guaranteed.
- Ordinary UI does not show raw formulas.
- Tests cover the first affected action's lower-skill and higher-skill behavior.

## Notes

- This should follow the minimal learning storage/helper work, but it should stay near the top of the 0.15.x lane because visible skill messages without visible consequences feel hollow.
- Balance should be tuned against the common early loop: look/examine, attack, freshen, recover.
