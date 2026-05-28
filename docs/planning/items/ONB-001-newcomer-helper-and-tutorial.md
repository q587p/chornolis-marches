---
id: ONB-001
title: Newcomer helper and tutorial
status: testing
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

## Implemented first slice

- `Дрімотна Межа` tutorial dream region on `z = -13`.
- New characters enter the dream after onboarding.
- `/sleep tutorial` returns to the saved tutorial position.
- `/sleep` without arguments routes to the tutorial while the character has not woken from it yet.
- `Прокинутися` / `/wake` leaves the dream and restores a valid real-world location.
- `Брама Сну` teaches visible locked exits: a locked south exit is shown, blocked movement gives a reason, and `/open` / `Відкрити` opens the route for a cycling window of about 30 seconds, 1 minute, 2 minutes, 4 minutes, 8 minutes, then back to 30 seconds.
- `0.12.2` adds two optional hub branches: `Ягідний просвіт сну` for `Роздивитися`, gathering and `Речі`, plus `Теплий присілок сну` for `Відпочити` as a brief stamina rest.
- `0.12.4` adds a south hub branch: `Плесо часу сну` for `/time`, followed by `Затишок останнього кроку` for beginner safety habits around `/look`, `/rest`, `/me` and waking from the tutorial.

## Remaining first scope

- Review and refresh `/start`, `/help`, fallback hints and the main keyboard so a brand-new player sees the current game, not an older slice of it.
- Expand the dream tutorial with branches that nudge the player through:
  - simple tracks and signs;
  - a first observation-learning scene, for example watching a fox move or attack and receiving a tiny `Слідування` or `Атака` improvement message;
  - social signals and nearby characters/creatures;
  - fire/light once the first real day-night loop is in place;
  - deeper danger/respawn safety once `/respawn` exists.
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

- Personalized prompts based on what the character has already done.
- Referral / invited-by prompt if the referral system leaves icebox.
- Teaching and observation links once skills/progression are implemented.
