---
id: QA-WILLOW-001
title: Willow Floodplain seed, map and route smoke
status: testing
type: qa
area: world
priority: high
estimate: 30m
tags:
  - map
  - world
  - willow-floodplain
  - qa
  - routes
depends_on:
  - MAP-WILLOW-001
---

# QA-WILLOW-001: Willow Floodplain seed, map and route smoke

## Goal

Keep the Willow Floodplain content slices honest: seed data should load, the map should render, routes should remain reachable both ways, and the closed settlement gate should stay closed until a dedicated settlement slice opens it.

## 0.14.22 Smoke Checklist

- Route from `start_border_camp` to the first Willow Floodplain location exists through the current riverbank.
- Route from the Willow Floodplain back to `start_border_camp` exists.
- The under-bridge location remains separate from the Willow pocket in this slice.
- The closed settlement gate remains blocked and is not bypassed through Willow exits.
- Notification settings are untouched by Willow map/content edits.

## Required Checks

- `npm run test:seed`
- `npm run test:seed:types`
- `node scripts/test/route-finding.cjs`
- `node scripts/test/world-content-html.cjs`
- `node scripts/test/text-targets.cjs`
- `node scripts/test/notifications.cjs`
- `node scripts/test/player-notification-settings.cjs`
- `npm run map:render`
- `npm run build`

## Acceptance

- All required checks pass, or any baseline failure is documented clearly in the release notes and PR risk section.
- No accidental unreachable island appears in the Willow pocket.
- No settlement bypass appears.
- No notification regression appears.
