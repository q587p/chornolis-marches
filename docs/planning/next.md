# Next

Candidate work for the next patch or minor versions.

This file should stay small. If everything is “next”, nothing is next.

## Current next lane

These items are already marked `status: next` here or in `docs/planning/items/`.

## Recommended next slice after 0.11.9

The 0.11.5-0.11.9 line landed Ukrainian aliases, scribe detail mode, inventory view, first fire/light, web status polish, chat privacy, first social reactions and the first torch-to-хмиз cleanup. The next patch sequence should build on those foundations instead of starting another wide surface.

Recommended order:

1. Add the first **newcomer helper / tutorial** pass, because people are already interested and the current opening should teach the actual playable slice.
2. Observe and tune the first **firewood / хмиз / campfire fuel** loop now that хмиз can extend or prepare ordinary campfires.
3. Add the first real **world time / day-night** state and make `/time` read it.
4. Add early **/respawn / Повернення** so dangerous exploration has a beginner safety valve.
5. Then return to **MAP-002 biome resources** once fire/light/time rules can influence gathering and visibility.

Good small follow-ups if a narrow patch is wanted:

- Shape ONB-001 into a first playable newcomer helper: update `/start`, `/help`, fallback hints and a skippable guide flow for look/examine/move/time/rest/gather/inventory/basic safety.
- Add item-level `Речі` actions: inspect/drop/use placeholder, starting with torches, berries and corpses.
- Add edible berries as the first hunger interaction from inventory.
- Add the first **animal-restoration offering** loop: small hare/mouse statues or similar forest charms where players can leave berries or herbs; after a delay, if local or regional prey population is low, a pair of young animals can appear without admin intervention.
- Add a low-prey warning from Дід Лісовик when all rabbits, mice or other basic prey disappear from the relevant scope. If he is asleep, the message can be framed as him mumbling through sleep, still heard across the borderland.
- Add first ground-money objects under the bridge / in dark places, using the existing ground-item pickup path.
- Add logs for who used `/reset` and other dangerous scribe tools.
- Add the first scribe name-approval loop: `/all character` or an equivalent filtered character list, service-profile buttons to approve/reject names, and a rejection message sent to the character.

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
- Let existing campfire/torch light decide whether full location descriptions, nearby targets, tracks and ground objects are visible at night.
- Add a simple dawn/day/dusk/night cycle before deeper moon phases or named weekday rules.
- Keep the first version simple enough to support the darkness creature, campfire warnings and later calendar work.

## WORLD-002 — Campfires and light

Status: next  
Area: survival  
Priority: high  
Tags: survival, light, crafting, night  
Depends on: WORLD-001

### Goal

Make fire a basic survival and exploration tool.

### First scope

- Build on the first pass: `/addCampfire` can create multiple timed campfires, expired fires remain as `Згасле вогнище`, torches can be carried/lit/refreshed, and light can reveal nearby targets.
- Add the first real firewood/hmyz gathering hook near forests, forest edges and old camps.
- Tune the first implemented `Додати хмиз` / `/add twigs campfire` behavior now that it extends burning campfires and prepares згаслі campfires.
- Keep the fuel model intentionally small for now: dry twigs exist, while larger branches, wet fuel, smoke and weather remain later.
- Connect fuel and light to WORLD-001 once day/night lands.

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
- Expand pickable хмиз coverage after testing the first seed pass. The initial implementation places small bundles in selected forest and dry-luka locations; later, most forest locations and some luka locations should receive biome-aware fuel sources.
- Add first foraging/firewood iteration by broadening `/gather` without arguments into local foraging: хмиз/dry sticks near campfires and forest edges, moss where suitable, animal bones, and rare minor coin finds. Keep outcomes biome-, region- and location-feature-dependent, and feed the existing `Додати хмиз` fuel loop.
- Add a first animal-restoration shrine/statue pass: authored small features such as a hare statue, mouse stone, carved burrow marker or similar forest charm. Players can place fitting offerings such as berries or herbs; after a queued delay and cooldown, the world may create two young prey animals when the area has fallen below a safe population threshold.
- Seed a first small ground-money find on world start/reset: a ґривня under the bridge and a few scattered шаги elsewhere. These should behave like visible location objects: shown by `/look` when light/visibility allows, discoverable by `/examine` in darkness, inspectable like corpses/objects, and pickable into `Речі`.
- Add a first NPC hunter/archer loop: a named hunter travels between nearby hunting grounds, looks for prey, attacks small animals, and leaves visible signs for players to observe. Later this should grow into tracking, traps and teaching hunting-related skills.
- Add name approval admin flow after the `isNameApproved` field is available.
- When adding new Telegram buttons, keep `docs/systems/input_aliases.md` in mind: player-facing action buttons should get a slash command or Ukrainian/MUD-style text equivalent unless they are only суто паґінаційні or archive-navigation buttons.

## Promotion candidates to review

These are still `backlog`, but recent work makes them worth reviewing before the next patch sequence.

- PERF-001 — budgeted and aggregated creature simulation. Queue pressure is currently visible enough that this may need promotion before larger ecology work.
- ADM-001 — admin permissions, name approval and restricted reset hardening. A first `Писар`/admin gate exists now, so remaining near-term work is audit logging, clearer role UX, first name-review tools and closing any leftover dangerous paths.
- Speech reply UX: `/reply`, `Відповісти` and `Відповісти як...` for addressed speech. This should probably stay behind the chat/social polish lane, not the ecology lane.
- Inventory item actions: the dedicated `Речі` view exists, so item details, dropping, using and eating berries are now small enough to promote when the survival loop needs them.
- Darkness creature / small coin omen: this becomes much more attractive right after WORLD-001 because it explicitly depends on darkness, light and calm observation.
- TECH-001 — service boundary and duplication cleanup. Keep this mostly behavior-preserving, but make it visible during patch planning because `worldTick.ts`, `status.ts`, `actionCompletions.ts`, `statusServer.ts`, `locations.ts` and `aliases.ts` are now large enough to slow safe feature work.

## Review checklist

Before moving an item here, ask:

1. Does it support the current phase?
2. Can it be implemented and tested independently?
3. Does it preserve atmosphere?
4. Does it avoid overbuilding?
