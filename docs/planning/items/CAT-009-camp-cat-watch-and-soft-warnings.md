---
id: CAT-009
title: Camp cat watch posture and soft warnings
status: testing
type: feature
area: atmosphere
priority: medium
estimate: 2-4h
tags:
  - cat
  - camp
  - atmosphere
  - safety
  - onboarding
depends_on:
  - CAT-002
  - CAT-006
---

# CAT-009: Camp Cat Watch Posture and Soft Warnings

## Goal

Let the camp spirit cat make the starter camp feel watched over without becoming a precise danger detector, combat companion or spam source.

The cat should sometimes notice camp-local pressure through body language: ears turning toward the watchtower, sitting between the fire and the dark, staring at mouse movement, or bristling when the night outside the camp feels too busy.

## Scope

- Add a small watch-posture state or line bank for the cat near the starter camp and watchtower.
- Let the cat react vaguely to local camp-edge pressure such as:
  - mice inside the allowed camp boundary;
  - owl signs/nocturnal pressure near the camp edge;
  - active darkness without enough light;
  - the campfire going low or out.
- Keep lines nonverbal and atmospheric.
- Rate-limit/cool down any proactive or ambient output.
- Prefer visible inspection or `/look`/`/examine` text over unsolicited messages when possible.

## Out of scope

- Exact hidden-target detection.
- Combat assistance against owls, foxes, wolves or players.
- Companion/follow behavior.
- Full cat social UI.
- Tutorial gating or mandatory cat interaction.

## Acceptance

- The cat can show at least a few camp-watch body-language states.
- Watch text does not reveal hidden creatures or exact numeric danger.
- The cat does not leave the camp/watchtower boundary to investigate.
- Any proactive output is guarded by the same anti-spam/session presence rules as other ambient lines.
- Tests or lightweight assertions cover representative copy helpers if a helper is added.

## Suggested validation

- `node scripts/test/camp-cat.cjs`
- `node scripts/test/ambient-lines.cjs` if ambient helpers are touched.
- `npm test`

## Implementation Notes

- `0.15.6` adds the first small watch-posture helper, `campSpiritCatWatchPosture(...)`, and routes camp-cat `LOOK` actions through it.
- The first slice is deliberately local and quiet: no proactive chat, no exact danger detector, no combat assistance and no cat hunting yet.
- The visible text can react to camp-local mice, night/dusk/dawn, active campfire light and the starter watchtower.
