---
id: CAMP-003
title: Shared beginner cache and hidden restock
status: testing
type: feature
area: core-loop
priority: high
estimate: 2-4h
tags:
  - camp
  - onboarding
  - inventory
  - light
  - restock
depends_on:
  - CAMP-002
---

# CAMP-003: Shared Beginner Cache and Hidden Restock

## Goal

Make the starter camp feel maintained by other people without turning first-session support into a shop, bounty table or ordinary economy.

## 0.14.11 Scope

- Add `Спільна скриня прибулих` near the starter watchtower as an inspectable shared cache.
- Seed a small stock of simple beginner supplies: berries, herbs, mushrooms, raw meat, cooked meat and twigs. Keep torches on the nearby torch stand so the two features do not duplicate each other.
- Let players take one useful item at a time from the cache through focused buttons or narrow text aliases.
- Let players contribute one matching carried item at a time.
- Restock quietly only when the cache has been unobserved for long enough, using `LocationFeature.data` as the first MVP storage.
- Keep this separate from hunter resupply routes and the closed-gate torch stand.

## Non-Goals

- No player-to-player ownership, theft, locks or permissions yet.
- No hidden settlement economy or rewards for contributing.
- No anti-hoarding, etiquette score or contribution reward system yet; this is intentionally future etiquette/economy work.
- No exact stock table in public-facing copy; player text should stay qualitative.
- No hunter route rewrite.

## Acceptance

- The shared cache appears as a distinct starter-camp/watchtower feature.
- Direct inspection explains what it is and shows qualitative stock.
- `cache`, `/cache`, `/take_cache`, `/contribute_cache` and natural cache phrases parse to the intended actions.
- Taking and contributing update the feature stock and player resources.
- Hidden restock waits until the cache has not been observed recently.
- Seed and parser tests cover the new feature.

## Validation

- `node scripts/test/beginner-cache.cjs`
- `node scripts/test/input-aliases.cjs`
- `node scripts/test/world-seed.mjs`
- `npm run planning:export`
- `npm test`
- `npm run build`

## Watchpoints

- `take cache` without an item currently defaults toward the starter-safety light path. If there is no torch available, it can fail instead of falling back to berries, twigs or other supplies. A future polish pass should prefer showing what is available before choosing for the player.
- Stock and hidden restock live in `LocationFeature.data`, so reset/reseed flows restore authored JSON state. This is acceptable for the MVP, but persistent camp stewardship may need a separate durable stock or item-instance layer later.
- The shared cache is a mutual-care surface, not a reward loop. Future ownership, anti-hoarding, etiquette, contribution records or economy hooks should be designed deliberately instead of inferred from the current simple stock counters.
- Raw/cooked meat in the beginner cache can make the survival start a little easier. Keep the initial quantities small, and revisit balance once hunger penalties, cooking failures and first-night danger become more consequential.
