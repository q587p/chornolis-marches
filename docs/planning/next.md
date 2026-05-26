# Next

Candidate work for the next patch or minor versions.

This file should stay small. If everything is “next”, nothing is next.

## Current next lane

These items are already marked `status: next` here or in `docs/planning/items/`.

## MAP-002 — Biome-based resources and spawn rules

Status: next  
Area: world, ecology  
Priority: high  
Tags: map, biome, resources, spawn-rules, ecology

### Goal

Make the new forest / dry luka / riverbank layout drive resource availability and future creature spawns by biome and region.

### First scope

- Keep generic animals out of seed by default.
- Define spawn rules per biome and region:
  - forest: rabbits, mice, foxes, occasional wolves;
  - deep forest: fewer prey, higher danger, more predator/spirit hooks;
  - dry luka: small prey, herbs, visibility, lower cover;
  - riverbank: herbs, fishing hooks later, bridge/gate encounters.
- Move resource amounts and regeneration toward biome rules instead of location-key string checks.
- Keep special locations such as `start_border_camp` hand-authored.

### Design intent

The expanded map should not just be larger. Different regions should feel and behave differently, even before full settlement or deep Chornolis systems arrive.

## WORLD-001 — Day/night cycle

Status: next  
Area: world_time  
Priority: high  
Tags: world, atmosphere, visibility, liminality

### Goal

Add dawn/day/dusk/night phases that change visibility, danger and available encounters.

### First scope

- Track current daypart in world state.
- Make `/time` read from that state instead of only static flavor text.
- Hide full location descriptions at night unless light reveals them.
- Keep the first version simple enough to support campfires and later moon/calendar work.

## WORLD-002 — Campfires and light

Status: next  
Area: survival  
Priority: high  
Tags: survival, light, crafting, night  
Depends on: WORLD-001

### Goal

Make fire a basic survival and exploration tool.

### First scope

- Build on the 0.11.5 first pass: `/addCampfire` can now create multiple timed campfires, and campfire/torch light can reveal nearby targets.
- Add the first real firewood/hmyz gathering hook near forests and campfires.
- Implement `Додати хмиз` / `/add twigs campfire` so it extends or refreshes an existing campfire instead of returning the placeholder.
- Connect light to the future day/night visibility rules once WORLD-001 lands: descriptions, exits, creatures, tracks and ground objects should depend on darkness/light.
- Keep deeper crafting and weather effects for later.

## SURV-001 — Early respawn support / Повернення

Status: next  
Area: survival  
Priority: high  
Tags: onboarding, respawn, beginner

### Goal

Add `/respawn` as **Повернення** for new or weak characters who get lost or knocked out before they are established.

### First scope

- Return eligible early characters to `start_border_camp`.
- Gate it behind a beginner/progression threshold.
- Add a cooldown or small consequence so it does not become fast travel.
- Keep the existing fallback text until the real flow is implemented.

## Recommended near-term candidates

- Add starter settlement skeleton and first NPC roles beyond the closed gate.
- Turn the new static `/time` output into a world-time service with season, moon circle/month, day and daypart progression.
- Add debug mode persistence and `/debugGet` / `/debugSet <true|false>` commands before more hidden-vs-technical UI work. Debug on should reveal technical details to everyone; debug off should keep exact details available only to `Писар Порубіжжя` players through a `Показати деталі` / `Приховати деталі` option.
- Add first foraging/firewood iteration by broadening `/gather` without arguments into local foraging: хмиз/dry sticks near campfires and forest edges, moss where suitable, animal bones, and rare minor coin finds. Keep outcomes biome-, region- and location-feature-dependent, and wire хмиз into the existing `Додати хмиз` placeholder.
- Seed a first small ground-money find on world start/reset: a ґривня under the bridge and a few scattered шаги elsewhere. These should behave like visible location objects: shown by `/look` when light/visibility allows, discoverable by `/examine` in darkness, inspectable like corpses/objects, and pickable into `Речі`.
- Add a first NPC hunter/archer loop: a named hunter travels between nearby hunting grounds, looks for prey, attacks small animals, and leaves visible signs for players to observe. Later this should grow into tracking, traps and teaching hunting-related skills.
- Add name approval admin flow after the `isNameApproved` field is available.
- When adding new Telegram buttons, keep `docs/systems/input_aliases.md` in mind: player-facing action buttons should get a slash command or Ukrainian/MUD-style text equivalent unless they are only суто паґінаційні or archive-navigation buttons.

## Promotion candidates to review

These are still `backlog`, but recent work makes them worth reviewing before the next patch sequence.

- PERF-001 — budgeted and aggregated creature simulation. Queue pressure is currently visible enough that this may need promotion before larger ecology work.
- ADM-001 — admin permissions and restricted reset. The admin surface now includes `/chat`, `/addCampfire`, `/addTorch`, `/addTwigs`, `/restAdmin`, cleanup and tick tools; before wider testing, this should move from temporary `ADMIN_TELEGRAM_IDS` checks to proper roles such as `Писар Порубіжжя`.
- Speech reply UX: `/reply`, `Відповісти` and `Відповісти як...` for addressed speech. This should probably stay behind the chat/social polish lane, not the ecology lane.

## Review checklist

Before moving an item here, ask:

1. Does it support the current phase?
2. Can it be implemented and tested independently?
3. Does it preserve atmosphere?
4. Does it avoid overbuilding?
