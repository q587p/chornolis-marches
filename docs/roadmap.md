# Chornolis Marches Roadmap

This roadmap tracks planned gameplay systems and long-term direction for the project.

Concrete implementation work should live in GitHub Issues / Projects or `docs/planning/`. This file keeps the larger vision readable and aligned with the game design pillars.

## Strong Project Pillars

- Ukrainian / Slavic dark fantasy atmosphere.
- Liminal frontier fantasy: the world exists on thresholds between settlement, forest, myth, spirit and danger.
- Atmosphere first: uncertainty, attention and mood matter more than mechanical breadth.
- Autonomous world simulation inspired by MUDs, Dwarf Fortress, Ultima Online and S.T.A.L.K.E.R.-style A-Life.
- Living ecosystem instead of static mobs.
- The world should feel alive even when the player does nothing.
- Dangerous exploration with incomplete information.
- Survival over power fantasy.
- Faction tension, settlement pressure and hostile groups.
- Skill-based progression through use, observation and apprenticeship instead of abstract character levels.
- Skills can be discovered by watching NPCs, animals, monsters or mythical beings use them.
- Small social interactions are core gameplay, not only flavor.
- Diegetic UI: player-facing words should feel like part of the world, not imported MMO terminology.
- Telegram-native UX with reusable gameplay services underneath.
- Ukrainian grammar and cases as immersion, not decoration.

## NOW / 0.12 Line — Dream Onboarding

Goal: finish the tutorial dream as the first playable threshold into Chornolis.

- Teach movement, looking, examining and basic interaction through the dream space.
- Keep `/sleep tutorial` as the explicit return path while the dream tutorial is active.
- Use sleep as a diegetic transition, not just a menu state.
- Establish the initial character condition: the player remembers their name, but almost nothing else.
- Keep the tutorial atmospheric and compact: voices, gates, tracks, small finds, rest, time and safety hints instead of a mechanical checklist.
- Keep terminology aligned with the canonical Ukrainian player-facing vocabulary: `Озирнутися`, `Місцина`, `Роздивитися`, `Снага`, `Речі` / `Поклажа`, `Риси`, `Навички`, `Сутичка`.

## Phase 1 — Core Loop and Living-World MVP

Goal: make the starting frontier feel playable, readable and dangerous without overbuilding the simulation.

- Beginner onboarding and dream tutorial continuation.
- `/respawn` for lost early characters, available only before a defined progression threshold.
- Movement, `Озирнутися`, `Роздивитися`, small item/resource discovery, stamina spend/recovery and `Відпочити` as a brief sit/rest action.
- Basic nearby beings: players, NPCs and creatures should be visible when conditions allow.
- Simple ambient/living-world events that can happen without direct player action.
- Traces and tracking hooks: footprints, broken grass, sounds in the dark, animal signs and strange marks.
- Early social signals: `Усміхнутися`, `Засміятися`, `Кивнути`, `Вклонитися`, `Вказати`, `Насупитися`, `Зітхнути`, `Помахати`.
- Contextual quick signals under player/NPC cards, plus a fuller `Ще сигнали` view.
- Day/night cycle.
- Night visibility rules: location descriptions are hidden without light; only the location name is visible.
- Night-only and day-only creatures, encounters and events.
- Campfires and other light sources.
- Firewood gathering in forest regions.
- Hidden exit names: show only directions until the player inspects.
- Starter settlement with NPCs.
- Fishing in river/lake regions.
- Compact news UI: show the latest item fully and older items as headlines.
- Keep early gameplay focused on dangerous exploration, rest, navigation and readable consequences.

## Phase 2 — World Attention and Learning

Goal: prove that the world teaches attentive characters.

- Observation-based learning: players can unlock or improve skills by watching more skilled beings act.
- Use-based progression: skills improve through relevant actions; dangerous or meaningful actions teach more than safe repetition.
- Meaningful failures can teach when the attempt was plausible.
- NPCs, animals, monsters and mythical beings can become sources of knowledge, not only targets, vendors or scenery.
- Basic foraging: gather small resources such as herbs, berries, mushrooms, dry branches and other local finds.
- Connect foraging to stamina, weather, time and location.
- Basic weather/day-night hooks that affect mood, visibility, traces and rest before full simulation arrives.

## Phase 3 — Survival & Crafting

Goal: make wilderness pressure and simple player-made solutions matter.

- Hunger, fatigue and rest.
- Knockout / unconsciousness flow when HP reaches zero.
- Hunting expansion.
- Traps and bait.
- Queue-aware skinning, trap setting and crafting.
- Basic crafting: campfire, torch, simple tools, bandages, traps.
- Fire, light and shelter as practical survival tools.
- Barter with NPCs.
- Basic trade between players.
- Regional resource availability.

## Phase 4 — Living World

Goal: deepen the ecosystem until locations feel like places with memory and movement, not static rooms.

- Weather: rain, fog, storms, wind.
- Deeper ecosystem: reproduction, migration, hunger, predator priorities.
- Predator hunting priority by age, HP, sex, hunger and opportunity.
- Tracks and signs with fading footprints, scents and blood trails.
- Rich scent/noise/footprint interpretation.
- Stealth and visibility.
- Animal migration between regions.
- Resource pressure: overgathering, overhunting and local scarcity.
- Day-of-week events inspired by Slavic/Ukrainian mythic calendar.
- Perun-like storm day: more storms, special encounters and quests.
- World history expansion and event log improvements.

## Phase 5 — Settlements, Economy & Society

Goal: connect survival and ecology to people, prices, routes, law and conflict.

- Settlement services: rest, trade, crafting, rumors, quest board.
- More NPC roles: herbalist, hunter, blacksmith, innkeeper, elder, volkhv/priest.
- NPC professions/фах derived from accumulated skills over time.
- Reputation by settlement and faction.
- Bounty system.
- Guards and crime response.
- Local prices and resource scarcity.
- Caravans and regional trade.
- Trade routes affected by danger, weather, bandits and player actions.
- Player-to-player barter and trade improvements.
- Rumors as imperfect information about ecology, factions, danger and opportunities.

## Phase 6 — Factions, PvP and Frontier Politics

Goal: make the frontier socially contested, not just environmentally dangerous.

- Kurins, Sich-like groups, local factions and cults.
- Open PvP with consequences by region.
- Guards, witnesses, crime status and bounty escalation.
- Settlement or faction laws by territory.
- Player groups competing over routes, resources and sacred places.
- Elections or leadership inside kurins/Sich-like groups.
- Cooperative goals: hunting contracts, escorting, construction, defense, rituals.
- Conflict goals: raids, revenge, bounty hunting, blockade and sabotage.
- Systems that make violence meaningful without making griefing the dominant playstyle.

## Phase 7 — Deep Simulation

Goal: let the world grow into a true living sandbox.

- Advanced professions without classes.
- Alchemy: potions, poisons, healing, stimulants.
- Rituals and sacred places.
- Mythic skill learning from spirits.
- Construction: camps, storage, shelters, fortifications.
- Player/NPC-created location features: signs, campfires, temporary markers, fading fires and relit fires.
- Deep bridge mechanics: bridge condition, repairs, risky crossings and links to fishing.
- Moon phases and deeper calendar simulation.
- Web `/map`, shared map view service, future messenger bridges and MUD-client gateway.
- Endgame mysteries of the Chornolis.

## Current Backlog Themes

These fit the project but are not necessarily the current focus.

- Reproduction and offspring.
- Day/night and light.
- Campfires and firewood.
- Early `/respawn` support.
- Dream tutorial continuation and beginner safety.
- Minimal playable core loop.
- Living-world ambient MVP.
- Observation-based learning MVP.
- Social signals and contextual interactions.
- Starter settlement and NPCs.
- Fishing.
- Basic crafting.
- Barter and trade.
- Use- and observation-based skill progression.
- Tracks, stealth and visibility.
- Admin/debug permissions for commands such as `/reset`, `/tickSet`, `/cleanupCreatures` and other dangerous tools.
- Richer auto-mode profiles and player-configurable auto behavior.
- NPC professions/фах derived from accumulated skills.
- Bridge features connected to future fishing and crossing mechanics.

## Icebox Themes

These are interesting but too early, too large or not yet validated.

- Deep faction politics.
- Large-scale territorial wars.
- Complex economy and regional supply chains.
- Deep calendar, moon phases and sacred days.
- Mythic skill learning from spirits.
- Full PvP bounty and witness system.
- Web map and MUD-style alternative clients.
- Advanced persistent automation: auto-behavior presets, safety rules, profession-aware choices and temporary delegation to companions/NPCs.
- Full combat system before the observation/living-world loop feels strong.
- Deep crafting trees before simple resource use has repeated needs.
- Full economy simulation before meaningful resources, settlement needs and travel pressure exist.

## Documentation Rules

- Most technical, roadmap and design documentation should be in English.
- `news.md`, in-world flavor text, examples and player-facing Ukrainian terminology may stay Ukrainian.
- Root `README.md` should remain a readable project landing page, not a full design archive.
