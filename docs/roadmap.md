# Chornolis Marches Roadmap

This roadmap is the source of truth for planned gameplay direction.

GitHub Issues and Projects may mirror this file, but they should not replace it. Concrete tasks live in `docs/planning/items/`; broader system design lives in `docs/systems/`.

## Strong Project Pillars

- Ukrainian / Slavic dark fantasy atmosphere.
- Liminal frontier fantasy: the world exists on thresholds between settlement, forest, myth, spirit and danger.
- Atmosphere first: uncertainty, attention and mood matter more than mechanical breadth.
- Autonomous world simulation inspired by MUDs, Dwarf Fortress, Ultima Online and A-Life-like territory simulation.
- Living ecosystem instead of static mobs.
- The world should feel alive even when the player does nothing.
- Dangerous exploration with incomplete information.
- Survival over power fantasy.
- Skill-based progression through use, observation and apprenticeship instead of abstract character levels.
- Skills can be discovered by watching NPCs, animals, monsters or mythical beings use them.
- Small social interactions are core gameplay, not only flavor.
- Diegetic Ukrainian UI and grammar-sensitive text.
- Telegram-native UX with reusable gameplay services underneath.

## Active Three-Month Line

The active line is not “add every cool system.”

The active line is:

> dream → waking → location → look/examine → signs/traces/small finds → stamina/rest → day/night/light → first safe return → first learning by observation.

## 0.13 — Core Loop & Onboarding Stability

Goal: make the first play session stable, understandable and atmospheric.

Primary outcomes:

- Character-name onboarding is reliable and diegetic.
- The dream tutorial teaches movement, looking, examining, rest and attention without becoming a checklist.
- `Повернення` / `/respawn` gives early characters a safety valve without becoming fast travel.
- Starter camp, bridge and nearby threshold locations communicate mood and next actions.
- Dangerous scribe/admin tools leave audit events.

See:

- `docs/planning/items/ONB-002-*.md`
- `docs/planning/items/ONB-001-*.md`
- `docs/planning/items/SURV-001-*.md`
- `docs/planning/items/LOOP-001-*.md`
- `docs/planning/items/ADM-001-*.md`

## 0.14 — Night, Light and Firewood

Goal: make darkness and light matter in ordinary play.

Primary outcomes:

- The world has a simple dawn/day/dusk/night state.
- `/time` reads actual world state.
- At night, location descriptions, nearby beings, tracks and ground objects are hidden or reduced without light.
- Campfires and carried torches reveal what darkness hides.
- Хмиз can be found, picked up and added to a campfire.
- The first biome-aware foraging table exists without becoming full ecology simulation.

See:

- `docs/planning/items/WORLD-001-*.md`
- `docs/planning/items/VIS-001-*.md`
- `docs/planning/items/FIRE-001-*.md`
- `docs/planning/items/HMYZ-001-*.md`
- `docs/planning/items/MAP-002-*.md`

## 0.15 — Attention and Learning MVP

Goal: prove that the world teaches attentive characters.

Primary outcomes:

- A minimal persistent learning/progress storage exists only if needed by the MVP.
- `Спостерігати` / observation is a narrow usable action, not a broad skill sheet.
- Watching a herbalist or relevant action can teach a first herbalism/gathering hint.
- Reading fresh tracks or watching an animal can teach a first tracking hint.
- Darkness, distance and light affect observation learning.
- One small living-world omen exists and is rate-limited.

See:

- `docs/planning/items/LEARN-001-*.md`
- `docs/planning/items/OBS-001-*.md`
- `docs/planning/items/TRACK-LEARN-001-*.md`
- `docs/planning/items/OMEN-001-*.md`

## Later Phase 1 / Core Loop Expansion

After 0.15, review:

- Starter settlement skeleton.
- First useful NPC roles beyond the gate.
- Ground money and small find objects.
- Local pickup/gather observer messages beyond хмиз.
- First animal-restoration charm.
- First NPC hunter/archer loop.
- Local console client for command/action smoke tests.

## Phase 2 — World Attention and Learning

Goal: deepen attention, apprenticeship and skill discovery.

- Observation-based learning from NPCs, animals, monsters and spirits.
- Use-based progression through meaningful actions.
- Meaningful failures that can teach.
- Hidden skill discovery through concrete moments, not menu choices.
- Skill-gated detail in tracks, creature inspection and local signs.

## Phase 3 — Survival and Crafting

Goal: make wilderness pressure and simple player-made solutions matter.

- Hunger, thirst and fatigue as atmospheric pressure.
- Fire, light and shelter as practical survival tools.
- Basic crafting: campfire, torch, simple tools, bandages, traps.
- Hunting and traps.
- Queue-aware skinning, trap setting and crafting.
- Barter with NPCs and basic player trade.

## Phase 4 — Living World

Goal: deepen the ecosystem until locations feel like places with memory and movement.

- Weather.
- Reproduction, migration, hunger and predator priorities.
- Resource pressure and local scarcity.
- Richer tracks, scents, noise and blood trails.
- Stealth and visibility.
- World history and local memory.

## Phase 5 — Settlements, Economy and Society

Goal: connect survival and ecology to people, prices, routes, law and conflict.

- Settlement services.
- NPC professions.
- Reputation.
- Guards and crime response.
- Local prices and scarcity.
- Caravans and trade routes.
- Rumors as imperfect information.

## Phase 6 — Factions, PvP and Frontier Politics

Goal: make the frontier socially contested, not only environmentally dangerous.

- Kurins, Sich-like groups, local factions and cults.
- PvP with consequences by region.
- Guards, witnesses, crime status and bounties.
- Group goals, raids, protection, ritual duties and route control.

## Phase 7 — Deep Simulation

Goal: let the world grow into a true living sandbox.

- Advanced professions without classes.
- Alchemy and prepared remedies.
- Rituals and sacred places.
- Mythic learning from spirits.
- Construction and camps.
- Bridges, crossings and fishing links.
- Moon phases and deeper calendar.
- Future web map, local console, MUD-like gateway and other clients.

## Documentation Rules

- Repository docs are the source of truth.
- Most technical, roadmap and design documentation may be English.
- Player-facing Ukrainian terminology, examples, news and flavor text should preserve the world voice.
