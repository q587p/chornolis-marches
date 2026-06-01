---
id: UX-001
title: Command and feature icon collision audit
status: backlog
type: chore
area: ux
priority: low
tags:
  - ux
  - icons
  - keyboard
  - features
---

# UX-001: Command and feature icon collision audit

## Goal

Keep Telegram keyboard command icons visually distinct from nearby location-feature icons, especially when both can appear in the same screen or learning moment.

## Problem

When a global command button uses the same icon as a visible or interactive feature, it can look like a feature-specific action instead of a stable command. The first observed case was `Час` sharing a torch-like icon with the torch-supply feature near the gate.

## Scope

- Audit main reply keyboard buttons, tutorial-only command buttons and feature action buttons together.
- Reserve fire/flame/torch-like icons for actual fire, torch, campfire or lighting actions.
- Prefer world/time-specific icons for `/time`, such as moon/phase/daypart symbols, until the full world-time UI exists.
- Add a small icon inventory note or helper if collisions keep recurring.

## Acceptance

- Common command buttons do not reuse the exact icon of prominent nearby features.
- Tutorial buttons remain easy to distinguish from feature actions.
- Feature icon choices stay documented in `docs/systems/location_features.md`.
