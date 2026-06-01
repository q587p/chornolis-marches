---
id: OWL-002
title: Nocturnal owl tuning and indirect signs
status: testing
type: tuning
area: ecology
priority: high
estimate: 1-2h
tags:
  - owl
  - ecology
  - night
  - predator
  - observation
  - tuning
depends_on:
  - OWL-001
---

# OWL-002: Nocturnal Owl Tuning and Indirect Signs

## Goal

Tune the first owl ecology slice after live observation and make owls legible as a nocturnal pressure on mice without turning them into a full new predator system yet.

`OWL-001` deliberately added only the minimal owl behavior: starter owls, day hiding/sleeping, dawn/dusk/night activity and strong mouse preference. This follow-up keeps that scope honest while giving us a place to record what should be checked next.

## Scope

- Review live ecology data after `0.15.0`:
  - mouse population pressure;
  - rabbit collateral damage;
  - owl starvation or disappearance;
  - predator kills by species where available;
  - creature deferred/processed counts if owl behavior affects queue pressure.
- Tune starter owl count and placement if three owls are too few, too many or too clustered.
- Tune daypart behavior if owls still appear to act during day or remain hidden/asleep too long after dawn/dusk/night changes.
- Add small indirect signs of owl presence if needed:
  - distant nighttime call;
  - brief shadow in a lit edge location;
  - feather-like trace;
  - small prey remains that suggest a night hunter.
- Keep signs useful for future observation-learning without implementing the full `/observe` loop in this task.

## Guardrails

- Do not add flight, nests, eggs, ranged hunting or owl reproduction here.
- Do not add a Prisma migration or schema change.
- Do not make owls a broad rabbit predator unless live data proves mouse-only pressure is too narrow.
- Do not expose exact hidden spawn/tuning numbers in player-facing text.
- Keep ordinary day visibility quiet: players should not see active owls everywhere in daylight.
- Keep this as tuning and small world feedback, not a full bird ecology system.

## Acceptance

- A short tuning note records whether starter owl count/placement changed or stayed as-is.
- Any added player-facing owl sign is local, atmospheric and does not increase global chat noise.
- Existing owl regression coverage still passes.
- If behavior changes, focused tests cover daypart activity and predator preference.
- `npm test` and `npm run build` pass for any code/data change.

## Notes

This is a near-term follow-up because owls are meant to stabilize mouse pressure before the observation-learning MVP. Deeper owl work belongs later: perches, tree/height awareness, nests, eggs, flight, reproduction, feathers as items and richer bird behavior should stay out of this slice.

## Implementation Notes

- `0.15.2` increases starter owl coverage from three to four owls by adding a riverbank-edge owl near the riverbank mouse cluster without placing a predator directly inside the breeding cell.
- Added four local inspectable owl-sign landmarks at owl pressure points. They are quiet local features, not proactive chat messages.
- Owl sign inspection now varies by internal daypart: night/dusk reads as active nocturnal pressure, dawn as retreating signs, and day as quiet hidden presence.
- Scribe/admin ecology stats now include predator performance grouped by species so owl impact can be compared against foxes and wolves after deploy.
