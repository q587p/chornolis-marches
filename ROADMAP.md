# Chornolis Marches Roadmap

This roadmap tracks planned gameplay systems and long-term direction for the project. Concrete implementation work should live in GitHub Issues / Projects; this file keeps the larger vision readable.

## Phase 1 — Atmospheric MVP

- Beginner onboarding and helper NPC / quest chain.
- `/respawn` for lost early characters, available only before a defined progression threshold.
- Day/night cycle.
- Night visibility rules: location descriptions are hidden without light; only the location name is visible.
- Night-only and day-only creatures, encounters and events.
- Campfires and other light sources.
- Firewood gathering in forest regions.
- Hidden exit names: show only directions until the player inspects.
- Starter settlement with NPCs.
- Fishing in river/lake regions.
- Compact news UI: show the latest item fully and older items as headlines.

## Phase 2 — Survival & Crafting

- Hunger, fatigue and rest.
- Knockout / unconsciousness flow when HP reaches zero.
- Hunting expansion.
- Traps and bait.
- Basic crafting: campfire, torch, simple tools, bandages, traps.
- Barter with NPCs.
- Basic trade between players.
- Regional resource availability.
- Observation-based learning: players can unlock or improve skills by watching more skilled beings act.

## Phase 3 — Living World

- Weather: rain, fog, storms, wind.
- Deeper ecosystem: reproduction, migration, hunger, predator priorities.
- Tracks and signs with fading footprints, scents and blood trails.
- Stealth and visibility.
- Day-of-week events inspired by Slavic/Ukrainian mythic calendar.
- Perun-like storm day: more storms, special encounters and quests.
- World history expansion and event log improvements.

## Phase 4 — Settlements, Economy & Society

- Settlement services: rest, trade, crafting, rumors, quest board.
- More NPC roles: herbalist, hunter, blacksmith, innkeeper, elder, volkhv/priest.
- Reputation by settlement and faction.
- Bounty system.
- Guards and crime response.
- Local prices and resource scarcity.
- Caravans and regional trade.

## Phase 5 — Deep Simulation

- Advanced professions without classes.
- Alchemy: potions, poisons, healing, stimulants.
- Factions and cults.
- Rituals and sacred places.
- Construction: camps, storage, shelters, fortifications.
- Endgame mysteries of the Chornolis.

## Strong Project Pillars

- Ukrainian / Slavic dark fantasy atmosphere.
- Liminal frontier fantasy: the world exists on thresholds between settlement, forest, myth, spirit and danger.
- Living ecosystem instead of static mobs.
- Incomplete information and exploration.
- Survival over power fantasy.
- Skill-based progression through use, observation and apprenticeship instead of abstract character levels.
- Skills can be discovered by watching NPCs, animals, monsters or mythical beings use them.
- Telegram-native UX.
- Ukrainian grammar and cases as immersion, not decoration.

## Newly Captured TODOs

- Add admin permissions before public testing: `/adminHelp` and `/reset` are open during development only.
- Make NPC professions/fах derive from accumulated skills over time, so players can also become known as знахарі, мисливці, рибалки, ковалі, etc.
- Keep bridge features passive until bridge/fishing/repair mechanics exist; then connect bridge metadata to fishing and crossing gameplay.
- Support player/NPC-created location features later: signs, campfires, temporary markers, fading fires and relit fires.

