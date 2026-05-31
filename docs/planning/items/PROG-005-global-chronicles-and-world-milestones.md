---
id: PROG-005
title: Global chronicles and world milestones
status: testing
type: feature
area: progression
priority: high
estimate: 2-4h
tags:
  - chronicle
  - world-events
  - onboarding
  - gate-hunting
  - milestones
depends_on:
  - WORLD-001-D
---

# PROG-005: Global Chronicles And World Milestones

## Goal

Add a public world chronicle for notable events in Chornolis, separate from the private personal chronicle in `PROG-004`.

The first slice should be modest: enough to show that the world keeps public зарубки when new characters arrive or when a living-world loop changes state, without adding abstract levels or noisy achievement popups.

## First Implemented Scope

- Add `/chronicles` and text aliases such as `хроніки`, `хроніка`, `останні події` and `події`.
- Render recent public chronicle entries grouped by local date.
- Record a new-player chronicle entry after onboarding completes and the player has a real character record.
- Record падальний рів state changes:
  - manual `/carcassQuest start`;
  - manual `/carcassQuest stop`;
  - automatic "enough for now" stop when carcass-dropoff saturation becomes active.
- Use existing `WorldEvent` storage as the MVP backing store, with a stable chronicle prefix so entries can be migrated to a dedicated table later if needed.

## Future Scope

- Add skill milestone entries once skills exist, without introducing character levels.
- Add quest/status entries for visible world-state changes.
- Add pagination or archive browsing when chronicle volume grows.
- Consider separate channels for:
  - public world chronicle;
  - private personal літопис;
  - group/guild histories.
- Add optional richer text for seasonal, weather, omen or shrine-related events after those systems exist.

## Tone Notes

- Keep entries short and atmospheric.
- Avoid generic MMO level copy such as "reached level 12".
- Prefer public-world framing: new traces, зарубки, notices, changed signs, visible state shifts.
- Do not publish scribe/admin-only command details in public chronicle copy; the chronicle should describe what changed in the world.

## Non-Goals

- Character levels.
- Public leaderboards.
- Global spam for every small action.
- Full personal journal UI.
- Social comparison or achievement badges.

## Acceptance

- `/chronicles` shows a compact public list of recent world chronicle entries.
- The same new player writes only one arrival entry.
- Падальний рів start/stop changes write chronicle entries.
- Repeated identical ravine state writes are deduplicated so the chronicle does not repeat the same state over and over.
- `/help`, `/commands` and input-alias docs mention the command.
- Tests cover basic chronicle formatting.
