---
id: QA-WILLOW-002
title: Willow live command and vertical edge smoke
status: backlog
type: qa
area: world
priority: medium
estimate: 30m
tags:
  - willow-floodplain
  - qa
  - aliases
  - verticality
  - admin
depends_on:
  - MAP-WILLOW-001
  - SOC-008
---

# QA-WILLOW-002: Willow Live Command and Vertical Edge Smoke

## Goal

After Willow / bridge / vertical content changes land, run a focused smoke pass for the player and scribe surfaces that are easy to miss in automated seed-route checks.

This task exists because several features can look fine in static map tests while still feeling odd in Telegram: feature inspect aliases, queued all-actions, broad admin/status pages, region speech and animals near vertical exits.

## Smoke Checklist

- Willow feature inspection aliases:
  - `look <feature>`;
  - `examine <feature>`;
  - Ukrainian target forms such as `оглянути`, `роздивитися`, `дивитися на`.
- `/cook_all` and `cook all`:
  - queue expected raw-meat count;
  - trim/fail safely if inventory changes before completion;
  - explain partial queue changes clearly enough that it does not feel like silent cancellation.
- Eat-all aliases:
  - berries / mushrooms / herbs / cooked meat forms queue correctly;
  - submit-time count snapshots are not misleading when later actions trim because hunger/HP/stamina or inventory changed.
- `/all`:
  - still paginates and renders after Willow/vertical population changes;
  - does not explode on creatures in bridge, tower or Willow edge locations.
- `/shout`:
  - remains region-wide and distinct from nearby `/yell`;
  - aliases still suggest or route correctly.
- Animal movement near `UP` exits:
  - ordinary animals do not climb unsupported `UP` exits;
  - animals on upper/vertical locations have a usable `DOWN` or safe fallback;
  - already-stranded animals from older prod state are identified for cleanup.

## Follow-Up Admin Cleanup Idea

If live state can strand animals or ordinary creatures above ground without a usable `DOWN`, add a scribe/admin inspection or cleanup command rather than relying on manual database edits.

Possible shapes:

- `/stuckCreatures` to list creatures in locations whose exits are not usable by their movement profile;
- `/unstickCreature <id>` to move one creature to the nearest safe reachable ground location;
- `/unstickCreatures vertical` for a cautious batch cleanup with a preview/confirmation.

Keep this as admin-only tooling. Player-facing text should make the world feel coherent; it should not expose pathfinding internals.

## Acceptance

- Smoke results are recorded in the PR/release notes when this task is run.
- Any failing alias gets either a focused parser test or a documented follow-up.
- Eat-all/cook-all partial queue behavior is either clear enough or gets a UX follow-up.
- Existing stranded animals have an admin cleanup plan if they cannot recover through normal movement.
