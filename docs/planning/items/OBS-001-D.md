---
id: OBS-001-D
title: Observation anti-farming cooldown
status: testing
type: feature
area: learning
priority: medium
estimate: 1h
tags:
  - observe
  - cooldown
  - anti-grind
depends_on:
  - OBS-001-C
---

# OBS-001-D: Observation anti-farming cooldown

## Goal

Prevent repeated progress from the same event.

## First Scope

- Track the observed gathering source event and suppress repeated progress from that exact source.
- Defer broader cooldown/rate-limit rules until observation has more than one source type.
- Keep "nothing new" silent for now so ordinary `/examine` does not become noisy.

## Acceptance

- Same observed event cannot be farmed.
- Cooldown is enforced without exposing raw timers to ordinary players.

## Implementation Order

Do after: `OBS-001-C`.

## 0.15.21 Note

`0.15.21` deduplicates gathering observation by the underlying `Gathering observable` source event. It does not add a visible cooldown UI.
