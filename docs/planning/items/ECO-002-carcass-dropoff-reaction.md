---
id: ECO-002
title: Carcass drop-off contribution and settlement reaction
status: testing
type: feature
area: ecology
priority: high
estimate: 2-4h
tags:
  - ecology
  - hunting
  - settlement
  - rewards
depends_on:
  - LOOP-002
  - CMD-002
---

# ECO-002: Carcass Drop-Off Contribution and Settlement Reaction

## Goal

Track carcass/remains contributions at the gate drop-off and create settlement responses that feel like local memory, not fixed bounty pricing.

## MVP Behavior

- Record each valid carcass/remains drop-off.
- Keep contributor identity when the contributor is a player.
- Record source as player, NPC or unknown.
- First player contribution gives atmospheric acknowledgement.
- A small threshold gives a small contextual supply/reaction.
- A larger threshold gives stronger acknowledgement or a future favor marker.

## Reward Guidelines

Allowed early rewards:

- small supplies such as berries, torch or firewood;
- rumor/path hint;
- guard or hunter acknowledgement;
- future local reputation/favor marker.

Avoid:

- `+XP`;
- `Quest complete`;
- fixed per-corpse bounty rates.

## Acceptance

- Valid drop-off records contribution without losing contributor identity.
- Invalid items do not count.
- First valid player contribution has acknowledgement.
- Threshold reactions trigger once on crossing the threshold.
- NPC contributions can be recorded by the same service without player rewards.
