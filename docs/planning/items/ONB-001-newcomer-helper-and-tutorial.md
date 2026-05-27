---
id: ONB-001
title: Newcomer helper and tutorial
status: next
type: feature
area: onboarding
priority: high
tags:
  - onboarding
  - tutorial
  - beginner
  - help
  - ux
---

# Newcomer helper and tutorial

## Goal

Add a first diegetic beginner path for new players who are interested now, before the world grows more complex.

The first version should help a new character understand what they can do without turning the opening into a mechanical checklist or a generic MMO tutorial.

## First scope

- Review and refresh `/start`, `/help`, fallback hints and the main keyboard so a brand-new player sees the current game, not an older slice of it.
- Add an optional newcomer helper / tutorial guide that can nudge the player through:
  - `Озирнутися` / `/look`;
  - `Роздивитися` / `/examine`;
  - movement and visible exits;
  - `/time`;
  - `Відпочити`;
  - basic gathering or finding useful things;
  - `Речі`;
  - simple tracks and signs;
  - basic safety: what to do if lost or exhausted.
- Keep the helper skippable.
- Prefer short contextual prompts over a long up-front explanation.
- Keep exact numbers hidden unless the player is a scribe/admin with technical details enabled.

## Tone options

Choose the guide form during implementation based on what feels best in the current opening:

- a borderland scribe;
- a local guide near the starter camp;
- a dream figure;
- a домовик-like presence;
- a forest-adjacent spirit;
- an animal companion.

Avoid a corporate tutorial voice. The helper should feel like someone or something from Порубіжжя.

## Acceptance notes

- A new player can reach their first meaningful action within a few taps/messages.
- The helper teaches current mechanics: location overview, closer inspection, movement, rest, inventory, time and basic danger.
- The player can skip or ignore the helper without breaking onboarding.
- `/help` and fallback unknown-input hints point toward the same beginner path.
- Future updates should keep this item in mind whenever early-game actions, resources, visibility or survival mechanics change.

## Later

- Dream tutorial after onboarding.
- Personalized prompts based on what the character has already done.
- Referral / invited-by prompt if the referral system leaves icebox.
- Teaching and observation links once skills/progression are implemented.
