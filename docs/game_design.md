# Chornolis Marches — Game Design

## Identity Formula

Chornolis Marches is a living liminal frontier simulation about surviving on the border between settlement, wilderness and myth.

It is not a heroic theme-park RPG. It is a borderland where the forest, settlements, animals, spirits, resources, roads and rumors continue to move whether the player is looking or not.

Its first playable promise is not a full RPG ruleset. The first promise is a world that notices, hides things, leaves traces and rewards attention.

**Порубіжжя Чорнолісу** — це лімінальна пісочниця на виживання на межі поселення, дикості й міту, де світ живе сам по собі, а персонажі зростають через те, що справді роблять, помічають і переживають.

## Current Playable Promise

The next playable version should make a new player feel this path:

> I enter through a dream, wake near the border, look around, examine what matters, notice a trace, spend stamina, rest, fear the dark, use light, see that the world moves without me, and learn that careful observation can teach.

Everything near-term should support this path.

## Core Pillars

### Atmosphere First

The world should feel ancient, dangerous, liminal and partially unknowable.

A small action that makes the world feel present is more valuable than a large subsystem that feels imported from a generic RPG.

Mechanical breadth should come after mood, attention, readable consequences and local texture.

### Liminal Frontier / Порубіжжя

Chornolis Marches is not just a forest adventure. It is a borderland: between settlement and wilderness, day and night, human and spirit, safety and danger, known and unknown.

The word “Marches” / “Порубіжжя” should guide the tone of the game. The player is always near a threshold, crossing from the ordinary world into something older, stranger and less certain.

«Порубіжжя Чорнолісу — це не просто край лісу. Це межа між селом і дикістю, днем і ніччю, людським і нелюдським, безпекою і небезпекою, знаним і незнаним».

### Autonomous World

The world should not wait for the player.

Animals move, age, hunt, flee, die and leave traces. NPCs and factions should eventually travel, trade, compete, hide, raid, guard and remember. A player may enter a location after something important has already happened there.

This is the main lesson taken from A-Life-like design: not surface aesthetics, but the feeling of a dangerous territory that keeps moving without the player.

### Incomplete Information

Players should not instantly know everything.

Locations, exits, creatures, tracks, rumors and danger often require attention, light, time, skill or help.

Information should often be partial, local and uncertain.

### Signs, Refrains and Dangerous Attention

The world may repeat images, sayings and signs, but repetition should feel like folklore and omen rather than citation trivia.

A direct borrowed line should be rare and threshold-bound. For the owl refrain, the strongest placement is the tutorial dream or the edge between dream and waking, not ordinary starter-camp description. The camp may echo it indirectly through rumors, animal signs or local speech.

`Озирнутися` gives orientation. `Роздивитися` rewards attention with a deeper layer. That deeper layer may clarify a practical action, suggest danger, or make the player less certain. Observation is useful, but not innocent: sometimes the thing being examined is also watching back.

Canonical internal rule:

```text
У Chornolis знання приходить через спостереження, але жодне спостереження не є невинним.
Світ дає знаки, але не гарантує, що знак означає те саме двічі.
```

### Living Ecosystem

Creatures interact with each other independently of players. Predators hunt prey. Prey reproduce and migrate. Corpses feed the forest back. Resources grow, get depleted and recover unevenly.

The ecosystem should not feel cute or decorative. It should create scarcity, danger, migration, sudden encounters, abandoned places and consequences.

### World Reactivity

Player actions should affect regions and ecology.

If players remove predators, overhunt animals, strip resources, break routes or empower hostile groups, the world should answer. The answer does not have to be immediate. It can appear as migration, shortage, disease, famine, rumors, rising prices, dangerous roads or creatures moving closer to settlements.

### Survival Over Power Fantasy

Travel and exploration should matter.

Fire, food, shelter, wounds, fatigue and darkness should create pressure without becoming busywork.

Survival should be atmospheric and systemic, not a row of punishment meters.

### Skills Grow Through Use and Observation

Characters should improve by doing things, but also by observing beings that are better at those things.

A player may first learn the idea of a skill by watching someone use it: seeing a herbalist gather herbs, a hunter set a trap, a wolf follow tracks, or a mythical creature move through the forest in an impossible way.

Observation should not always grant progress. Learning depends on the observer's relevant attributes, current skill, attention, context, visibility, danger, and the difference between their skill and the observed being's skill.

Progression should feel like lived experience, apprenticeship, imitation and discovery — not abstract level-ups.

### Social Signals as Core Play

Small social gestures are gameplay, not only decorative emotes.

Signals such as nodding, waving, pointing, smiling, bowing or frowning let players communicate intent in a compact Telegram-native way. They also let NPCs, animals and spirits react without requiring every interaction to become speech, combat or a quest.

Signals should support actor, target and observer text. They should be visible in local history where useful and should eventually feed reputation, mood, learning, fear, ritual politeness and creature reactions.

### Diegetic Ukrainian UI

Player-facing words should feel like part of the world, not imported MMO terminology.

Prefer terms such as:

- `Озирнутися`
- `Місцина`
- `Роздивитися`
- `Снага`
- `Речі` / `Поклажа`
- `Риси`
- `Навички`
- `Сутичка`
- `Повернення`

Ukrainian grammar and cases are immersion, not decoration.

### Telegram-Native First, Reusable Core Later

The game should feel good inside Telegram: compact messages, useful buttons, low spam, readable local history and strong atmosphere in short text.

Telegram is the first interface, not the whole architecture. Gameplay logic should keep moving toward reusable services so web, map tools, local console clients or future MUD-like gateways can exist later.

## Tone

Chornolis Marches is closer to a living frontier simulator than to a traditional MMORPG.

The world should feel:

- dangerous;
- liminal;
- partially unknowable;
- alive without the player;
- shaped by migration, scarcity, memory and old powers.

## Design Guardrails

### Build now

- Dream onboarding.
- Movement, looking, examining.
- Small finds and local signs.
- Stamina and active rest.
- Tracks and fading traces.
- Nearby beings.
- Day/night and first visibility rules.
- Campfires, torches and хмиз.
- Beginner return / `Повернення`.
- Narrow observation-learning MVP.
- First liminal sign/refrain content pack: dream-threshold owl quote, conditional owl examine text, magical-campfire examine layer and fishing-water seeds.

### Delay until the core loop is strong

- Full combat.
- Full crafting trees.
- Full economy and regional prices.
- Factions and settlement politics.
- PvP bounty/witness systems.
- Deep calendar, moon phases and seasonal rituals.
- Web map and MUD gateway.
- Large socials catalog.
- Advanced automation.
- Explaining every owl, dream, fire or sign as fixed lore.
- Turning every location into an obvious external reference.

## Content Voice Guardrails

The quotation/sign layer should follow these rules:

- Direct quotation is a spice, not a content strategy.
- The direct owl line belongs in a liminal one-time or rare threshold moment.
- Later echoes should be altered: village sayings, NPC rumors, feature text, dream fragments, or conditional `examine` results.
- Ukrainian / Slavic myth remains the in-world body of the setting; Lynch, Heraclitus, Dante, Shakespeare and map/territory ideas are structural references, not visible lore labels.
- Ordinary survival surfaces should stay practical. Not every campfire, fish, path, map or owl needs to be strange.

## Inspirations

- MUDs.
- Ultima Online.
- Unreal World.
- Dwarf Fortress.
- CDDA.
- S.T.A.L.K.E.R.-style A-Life.
- Ukrainian folklore and Slavic mythology.
- David Lynch / Twin Peaks for dream logic, owls, fire, observation and signs as unstable atmosphere.
- Heraclitus, Dante, Shakespeare and map/territory thought as deep structural references for hidden nature, lost paths, reversed signs and unreliable models.

The inspiration is not surface genre copying. It is autonomous world movement, dangerous exploration, incomplete information, ecology, memory and places that feel older than the player.
