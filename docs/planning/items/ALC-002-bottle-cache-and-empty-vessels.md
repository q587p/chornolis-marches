---
id: ALC-002
title: Root-pocket bottle cache and empty vessel resource
status: testing
type: feature
area: survival
priority: high
estimate: 2-4h
tags:
  - alchemy
  - bottles
  - inventory
  - map
  - cellar
  - onboarding
depends_on:
  - MAP-004
  - ITEM-001
---

# ALC-002: Root-Pocket Bottle Cache and Empty Vessel Resource

## Goal

Add the first reusable vessel loop for future tinctures: a simple empty bottle resource and an old bottle niche in the root pocket beneath the starter cellar.

The bottle source should feel like a humble camp/herbalist utility, similar in function to the torch source but placed behind attention-gated exploration so it is not handed to the player immediately.

## First Scope

- Add resource type:
  - key: `empty_bottle`;
  - player-facing name: `порожня пляшечка`.
- Add lexicon/world noun forms for the bottle.
- Add a feature in `start_cellar_root_pocket`:
  - key: `start_root_pocket_bottle_niche`;
  - name: `Глиняна ніша з пляшечками`;
  - data flags:
    - `empty_bottle_source: true`;
    - `infinite_for_now: true`;
    - `future_limited_stock: true`;
    - `future_dirty_bottle_washing: true`;
    - `herbalist_resupply: true`.
- Update `start_cellar_root_pocket` description to hint at the niche without turning the place into a loot room.
- Add player command/button path if consistent with existing pickup/take patterns:
  - `/take_bottle`;
  - `take bottle`;
  - `взяти пляшечку`;
  - `взяти пляшку`.
- Taking a bottle grants exactly one `empty_bottle`.
- Keep the source unlimited for now, with future metadata for washing/limited stock.
- Add admin/scribe resource surfaces if new resource types require explicit updates.

## Guardrails

- The root pocket remains safe and small.
- Do not add potions in this slice.
- Do not add dirty bottles, water, thirst or washing yet.
- Do not make this a generic loot cache.
- Do not let NPCs drain or reserve the source before player use; herbalist route use comes later.
- Keep ordinary text diegetic and avoid "infinite source" wording.

## Acceptance

- `empty_bottle` exists as a resource with Ukrainian name/forms.
- The root-pocket bottle niche exists, is inspectable, has aliases and carries the source flags.
- A player in the root pocket can take one empty bottle.
- Invalid location / missing feature / hidden feature cases fail without inventory changes.
- Focused tests cover source detection, grant behavior and aliases.
- `world-seed` tests assert the feature is in `start_cellar_root_pocket`.

## Implementation Notes

- Runtime slice added `empty_bottle` / `порожня пляшечка`, a narrow `start_root_pocket_bottle_niche` feature in `start_cellar_root_pocket`, and `empty_bottle_source` handling.
- The source is intentionally unlimited for now and gives exactly one bottle per take action.
- Supported player paths include the feature button, `/take_bottle`, `take bottle`, `взяти пляшечку` and ordinary pickup fallback for dropped `empty_bottle` ground items.
- This slice does not add tinctures, `/brew`, recipe services, dirty/broken bottles, water/thirst, washing, shops, barter, NPC herbalist brewing, or a public crafting UI.
