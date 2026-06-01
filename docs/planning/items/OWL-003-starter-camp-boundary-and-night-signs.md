---
id: OWL-003
title: Starter camp owl boundary and night signs
status: testing
type: tuning
area: ecology
priority: medium
estimate: 2-4h
tags:
  - owl
  - camp
  - ecology
  - night
  - onboarding
depends_on:
  - OWL-002
  - CAT-002
---

# OWL-003: Starter Camp Owl Boundary and Night Signs

## Goal

Keep owls useful as nighttime mouse pressure without making the starter camp feel like an immediate predator trap.

Owls may be heard or hinted at near the camp edge, but the camp and watchtower should remain a clearer first-session anchor unless a later story/event deliberately changes that safety.

## Scope

- Review whether starter owls can path, hunt or pressure too close to `start_border_camp` and `start_border_watchtower`.
- Add or document a camp-safe boundary rule if needed:
  - owls may hunt nearby mice outside the camp;
  - owls should not routinely enter the camp/fire/watchtower pair;
  - owl signs can appear at camp-adjacent edges without creating proactive spam.
- Add one or two camp-adjacent night signs if live play needs better legibility:
  - distant call beyond the firelight;
  - a quiet feather-like trace outside the camp;
  - the cat looking upward without revealing an exact owl target.
- Keep direct owl encounters away from the first-session core loop unless intentionally authored.

## Out of scope

- Owl flight, perches, nests, eggs or reproduction.
- New combat mechanics.
- Cat-vs-owl fights.
- Full observation-learning.
- Turning camp into a fully safe zone for all threats.

## Acceptance

- The starter camp/watchtower pair stays protected from routine owl hunting pressure.
- Camp-adjacent owl signs are local and atmospheric, not global notifications.
- Owl tuning still preserves mouse-pressure usefulness outside the camp.
- Any cat-related sign remains vague and nonverbal.
- Tests cover any new boundary helper or seed/content invariant if code/data changes.

## Suggested validation

- `node scripts/test/owl-nocturnal.cjs`
- `node scripts/test/starter-animals.cjs` if seed placement changes.
- `node scripts/test/camp-cat.cjs` if cat sign helpers are touched.
- `npm test`

## Implementation Notes

- `0.15.6` adds a narrow starter-camp owl-safe boundary for `start_border_camp` and `start_border_watchtower`.
- Routine owl movement will not choose exits into those locations.
- If an owl somehow reaches the protected pair through admin/debug drift or old state, its carnivore tick leaves if possible or only watches instead of selecting prey there.
- This does not make surrounding camp-edge locations safe and does not add flight, nests, ranged hunting or owl-vs-cat scenes.
