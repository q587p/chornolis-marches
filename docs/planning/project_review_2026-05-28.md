# Project Review — 2026-05-28

> Historical context: this review guided the 0.13-0.15 vertical slice. It is preserved for design memory, but it is not the current active lane. Use `docs/planning/next.md` and `docs/planning/post_0_16_lane.md` for current planning.

## Verdict

Chornolis Marches should spend the next three months building one vertical experience, not many parallel systems.

The vertical experience is:

> dream → waking → location → look/examine → signs/traces/small finds → stamina/rest → darkness/light → beginner return → learning through observation.

## Current Strength

The project already has a clear identity: a living liminal frontier where the world moves without the player and characters grow through what they actually do, notice and survive.

The strongest design promise is not “full RPG rules.” It is a world that notices, hides things, leaves traces and teaches attentive characters.

## Main Risk

The backlog is rich enough to dilute focus.

Combat, crafting, economy, factions, PvP, rituals, moon phases, web maps, MUD gateways and deep ecology all fit the long-term vision. They should not shape the next three months unless a very narrow slice directly supports the current vertical experience.

## Strategic Decision

The next three months should be:

- 0.13 — Core Loop & Onboarding Stability.
- 0.14 — Night, Light and Firewood.
- 0.15 — Attention and Learning MVP.

## What To Build First

1. Character-name onboarding polish.
2. Compact dream tutorial completion.
3. Beginner return / `Повернення`.
4. Starter location and bridge threshold polish.
5. Day/night world state.
6. Shared visibility layer.
7. Campfire/torch/hmyz loop.
8. First biome-aware foraging slice.
9. Minimal learning progress only if needed.
10. First observation-learning moments.
11. One living-world omen.

## What To Delay

- Full combat.
- Full crafting trees.
- Full economy.
- Caravans.
- Factions and settlement politics.
- PvP bounty and witness systems.
- Deep rituals and sacred calendar.
- Moon phases.
- Web map and MUD gateway.
- i18n.
- Advanced automation.

## Acceptance Test After Three Months

A new player can:

1. create a character with a fitting name;
2. enter and leave the dream tutorial;
3. wake at the border;
4. move, look and examine;
5. notice a sign, trace or nearby being;
6. spend stamina and rest;
7. experience darkness and use light;
8. find and use хмиз;
9. use `Повернення` while still a beginner;
10. learn a first hint by observing the world.

If this works, Chornolis has crossed from “interesting simulation” into “playable identity.”
