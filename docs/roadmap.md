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
- Sleep and dreams are liminal systems: ordinary sleep belongs to survival, while tutorial/lucid dreams are explicit dream states, not generic teleportation.
- Dream language should avoid “soul” / Christian framing; prefer attention, awareness, dream presence and place-spirit language.
- Small social interactions are core gameplay, not only flavor.
- Social memory and small group travel: players and NPCs can remember, follow, lead, lag behind and reunite without turning the game into a generic MMO party system.
- Diegetic Ukrainian UI and grammar-sensitive text.
- Telegram-native UX with reusable gameplay services underneath.

## Active Three-Month Line

The active line is not “add every cool system.”

The active line is:

> dream → waking → location → look/examine → signs/traces/small finds → stamina/rest → day/night/light → first safe return → first learning by observation.

## 0.13 — Core Loop & Onboarding Stability

Goal: make the first play session stable, understandable and atmospheric.

0.13 should close once the first-session path is stable. Do not pull day/night into `0.13.x`; use the last `0.13` patch for a compact first-session closure audit, small copy fixes and planning cleanup.

Primary outcomes:

- Character-name onboarding is reliable and diegetic.
- The dream tutorial teaches movement, looking, examining, rest and attention without becoming a checklist.
- Tutorial sleep remains explicit as `/sleep tutorial`, so it does not conflict with future ordinary `/sleep`.
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

The first `0.14` slice should be a tiny internal world-clock foundation. It must not bind day/night to the real-world clock, server timezone or player local time. The clock advances from elapsed real milliseconds through stored Chornolis world state: by default, `1 in-game hour = 120_000 ms`.

The world-time foundation should include 13 lunar circles per year and 28 days per circle from the start, because moon phase and moonlight are part of night visibility. Deep calendar simulation remains out of scope.

Primary outcomes:

- The first `0.14` patch establishes stored/derived Chornolis world-clock state before darkness changes what players can see.
- The world has a simple dawn/day/dusk/night state derived from internal world minutes.
- `/time` reads actual internal world state: year, lunar circle, day, clock, daypart, moon phase and weather summary.
- Moon illumination affects the first light calculations at night.
- Weather exists as a small persistent state and can reduce/shape visibility later.
- A shared light snapshot helper combines daypart, moon illumination, weather and active local light before darkness changes ordinary `/look` output.
- At night, location descriptions, nearby beings, tracks and ground objects are hidden or reduced without light.
- Campfires and carried torches reveal what darkness hides.
- Хмиз can be found, picked up and added to a campfire.
- First-session guidance reacts to the new darkness rules: beginners get short diegetic help after their first reduced-visibility night, and the starter camp reads as a shared border-camp return anchor rather than a random coordinate.
- The first biome-aware foraging table exists without becoming full ecology simulation.
- Lying posture and ordinary sleep can begin as a small survival slice after rest/posture rules are stable.

See:

- `docs/planning/items/WORLD-001-*.md`
- `docs/planning/items/VIS-001-*.md`
- `docs/planning/items/FIRE-001-*.md`
- `docs/planning/items/HMYZ-001-*.md`
- `docs/planning/items/MAP-002-*.md`
- `docs/planning/items/SLEEP-001-*.md`
- `docs/planning/items/SLEEP-002-*.md`

## 0.15 — Attention and Learning MVP

Goal: prove that the world teaches attentive characters.

Primary outcomes:

- A minimal persistent learning/progress storage exists only if needed by the MVP.
- `Спостерігати` / observation is a narrow usable action, not a broad skill sheet.
- Watching a herbalist or relevant action can teach a first herbalism/gathering hint.
- The tutorial dream can add optional action-semantics rooms where `Озирнутися` gives orientation and `Роздивитися` reveals a concrete detail or next action.
- Reading fresh tracks or watching an animal can teach a first tracking hint.
- Darkness, distance and light affect observation learning.
- One small living-world omen exists and is rate-limited.
- Hidden presence remains a prepared follow-up, not an automatic part of the first omen unless the visibility and light foundations are ready.
- Follow-up 0.15.x work may add risky theft and hiding after the first observation MVP is stable: a small `Вкрасти` action, separate success/detection checks, a preparatory `Сховатися` action, a first theft warning and scribe-visible incident statistics.

See:

- `docs/planning/items/LEARN-001-*.md`
- `docs/planning/items/OBS-001-*.md`
- `docs/planning/items/TRACK-LEARN-001-*.md`
- `docs/planning/items/OMEN-001-*.md`
- `docs/planning/items/THEFT-*.md`
- `docs/planning/items/HIDE-*.md`
- `docs/systems/theft-and-hiding.md`

## Later Phase 1 / Core Loop Expansion

After 0.15, review:

- Starter settlement skeleton.
- First useful NPC roles beyond the gate.
- Ground money and small find objects.
- Local pickup/gather observer messages beyond хмиз.
- First animal-restoration charm.
- First NPC hunter/archer loop.
- Local console client for command/action smoke tests.
- First `Знайомства` / contacts layer for remembered people and NPCs.
- Follow intent and player-led `Гурт` MVP.
- Group movement where capable members follow the leader and exhausted/wounded members can fall behind.
- World-time automatic waking and first sleep comfort modifiers.
- First sleeping-body / dream-presence split for tutorial and lucid dreams.
- First risky theft and hiding slice: one small item per attempt, pair cooldown, protected tutorial/dream locations and visible consequences through social memory.
- First scribe-facing theft statistics: total attempts, successes, observed attempts, blocked attempts and commonly stolen resources.

## Phase 2 — World Attention and Learning

Goal: deepen attention, apprenticeship and skill discovery.

- Observation-based learning from NPCs, animals, monsters and spirits.
- Use-based progression through meaningful actions.
- Meaningful failures that can teach.
- Hidden skill discovery through concrete moments, not menu choices.
- Skill-gated detail in tracks, creature inspection and local signs.
- Hidden presence foundation: hidden beings may create private atmospheric messages without becoming visible targets.
- Stealth, theft and vigilance can grow through use, observation and meaningful failures.
- Hidden approach and suspicious movement can become learning sources for attentive characters.
- Lucid dream instances can reveal ritual conditions, place-spirit moods, quest nuance and knowledge flags without becoming ordinary fast travel.

## Phase 3 — Survival and Crafting

Goal: make wilderness pressure and simple player-made solutions matter.

- Hunger, thirst and fatigue as atmospheric pressure.
- Fire, light and shelter as practical survival tools.
- Basic crafting: campfire, torch, simple tools, bandages, traps.
- Ordinary sleep as stronger recovery than rest, shaped by fire, shelter, danger and later weather.
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
- Hidden follower spirits such as `стежник` that can watch, follow briefly, respect magic campfire boundaries and remain outside ordinary target/track UI until revealed by future systems.
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
- Social graph: acquaintances, trust, local memory and NPC relationship hooks.
- Theft consequences deepen into local memory, trust, suspicion, restitution, warnings and settlement-specific responses.
- Travel groups / `Гурти` for settlement errands, escorting, guiding and local duties.

## Phase 6 — Factions, PvP and Frontier Politics

Goal: make the frontier socially contested, not only environmentally dangerous.

- Kurins, Sich-like groups, local factions and cults.
- PvP with consequences by region.
- Guards, witnesses, crime status and bounties.
- Group goals, raids, protection, ritual duties and route control build on the `Гурт` system.

## Phase 7 — Deep Simulation

Goal: let the world grow into a true living sandbox.

- Advanced professions without classes.
- Alchemy and prepared remedies.
- Rituals and sacred places.
- Mythic learning from spirits.
- Construction and camps.
- Bridges, crossings and fishing links.
- Moon phases and deeper calendar.
- Advanced lucid and group dreams, including place-spirit influence, dream combat/appeasement and rare guarded item transfer.
- Future web map, local console, MUD-like gateway and other clients.

## Documentation Rules

- Repository docs are the source of truth.
- Most technical, roadmap and design documentation may be English.
- Player-facing Ukrainian terminology, examples, news and flavor text should preserve the world voice.
