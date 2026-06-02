---
id: CAT-010
title: Camp cat cache and newcomer presence
status: testing
type: feature
area: onboarding
priority: low
estimate: 2-4h
tags:
  - cat
  - camp
  - beginner-cache
  - onboarding
  - atmosphere
depends_on:
  - CAT-001
  - CAMP-003
---

# CAT-010: Camp Cat Cache and Newcomer Presence

## Goal

Make the camp spirit cat feel tied to the shared beginner camp without turning it into a loot dispenser, hoarder or pet.

The cat can sit near the beginner cache, inspect newcomers from a safe distance, curl near the fire after someone contributes supplies, or quietly move away when someone takes too much. This should support camp atmosphere and etiquette without adding a new economy.

## Scope

- Add a small set of cat body-language lines around the beginner cache and starter camp.
- Optionally show a cat presence note after cache inspection when the cat is nearby.
- Let contribution/take events choose from very rare, non-blocking cat reactions.
- Keep the cat's reaction descriptive only: no item rewards, no punishment and no hidden counters in player-facing text.
- Record whether this should later feed personal chronicles, but do not implement chronicles here.

## Out of scope

- Cat-only `give` or feeding UI; generic `give` remains the prerequisite for feeding slices.
- Theft of cache supplies.
- Anti-hoarding enforcement.
- Petting/friendship levels.
- Any permanent newcomer tutorial gate.

## Acceptance

- Cache/camp cat copy is local, quiet and non-spammy.
- The cat does not block cache use or make supplies feel owned by a single player.
- The feature works even if the cat is not currently in the location.
- Any added behavior preserves the current camp boundary rules.

## 0.15.10 Implementation Notes

- Cache inspection can add one quiet Кіт-бережник presence line when the cat is visibly in the same watchtower location.
- The line changes slightly if local mice are present, but it remains descriptive only: no rewards, punishment, ownership, theft or hidden player-facing counters.
- If the cat is elsewhere, the cache inspection text remains unchanged.

## Suggested validation

- `node scripts/test/beginner-cache.cjs`
- `node scripts/test/camp-cat.cjs`
- `npm test`
