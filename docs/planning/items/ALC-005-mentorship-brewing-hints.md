---
id: ALC-005
title: Herbalist mentorship brewing hint
status: backlog
type: ux
area: learning
priority: medium
estimate: 2-4h
tags:
  - mentorship
  - herbalist
  - alchemy
  - bottles
  - learning
  - onboarding
depends_on:
  - ALC-002
  - ALC-001
  - NPC-003
---

# ALC-005: Herbalist Mentorship Brewing Hint

## Goal

After a player meaningfully grows gathering/herbalism through practice or mentorship, a herbalist can occasionally hint that the player is ready to try a prepared tincture and point diegetically toward the root-pocket bottle niche.

This should feel like a teacher noticing the player's hands, not a quest marker or skill-level popup.

## Trigger Candidates

Use one of these, whichever is safest with current learning data:

- player reaches a qualitative `gathering` level threshold;
- player records several `gathering` / `resource:herbs` milestones;
- player receives several mentor lesson feedback lines from a herbalist;
- player has active herbalist mentorship and has not yet crafted a tincture.

## Hint Shape

Example:

```text
Знахарка дивиться на ваші руки, не на торбу.
— Вже не просто рвете траву. Добре. Якщо ще не пробували настоювати — під погребом є коренева кишеня. Там лишають пляшечки для тих, хто не плутає поспіх із умінням.
```

Shorter variant:

```text
— Траву можна не тільки носити, — каже знахарка. — Під погребом є стара ніша з пляшечками. Коли руки дозріють до настоянки, згадайте про неї.
```

## Guardrails

- Do not expose exact levels, thresholds or raw totals.
- Do not spam the hint; use a marker/cooldown.
- Do not show the hint before the bottle niche exists.
- Do not require mentorship for the player to craft if they independently find the bottle source and ingredients.
- Do not force the player into a quest flow.
- Do not reveal hidden route mechanics if the player has not reached the cellar/root pocket yet; hint vaguely enough to preserve discovery.

## Acceptance

- A qualifying player can receive a rare herbalist hint.
- The hint is not shown repeatedly.
- The hint does not expose raw learning data.
- A player who has already crafted a tincture does not keep receiving beginner brewing hints.
- Tests cover trigger eligibility, cooldown/dedupe and no raw-key leaks in ordinary text.
