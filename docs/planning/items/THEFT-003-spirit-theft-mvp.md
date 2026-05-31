---
id: THEFT-003
title: Strange and spirit theft MVP
status: backlog
type: feature
area: spirits
priority: low
estimate: 1-2d
tags:
  - theft
  - spirits
  - omen
  - hidden-presence
  - future
depends_on:
  - THEFT-001
  - HIDE-001
  - OMEN-001-A
---

# THEFT-003 — Strange and Spirit Theft MVP

## Status

Future follow-up.

## Goal

Add rare strange theft that supports spirits or other beings stealing small things, flame, warmth or certainty without becoming a normal loot system.

## Prerequisites

- `THEFT-001` implemented.
- `HIDE-001` implemented or hidden presence foundation ready.
- Incident logging supports creature actors.
- Player notification rules are clear.

## First safe version

A strange being may rarely steal one small thing:

- `berries`;
- `herbs`;
- `twigs`;
- `torch`.

Alternative non-item effects:

- dim or douse a carried light source;
- leave a sign and no item loss;
- create a clue for attentive characters.

## Tone

The theft should feel like an omen or intrusion, not like ordinary pickpocketing.

Example text when unnoticed at first:

```text
У поклажі ніби побільшало тіні. Ви перераховуєте речі — бракує {resourceName} ×1.
```

Example text when noticed:

```text
На мить біля вашої поклажі ворушаться тонкі пальці з кори й туману.
```

## Rules

- Very low frequency.
- Never steal protected tutorial-critical resources.
- Prefer signs and atmosphere over material damage.
- Use the same `TheftIncident` table.
- Consider a special `blockReason` or `stolenResourceKey` for flame/dimmed-light effects.

## Acceptance criteria

- Strange theft uses the same statistics pipeline.
- It can be noticed by attentive characters.
- It does not spam or feel punitive.
- It can create a clue or omen.
- It respects protected locations and critical item protection.
