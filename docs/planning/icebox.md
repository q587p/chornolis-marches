# Icebox

Icebox stores ideas that fit the project but should not shape near-term work.

It is not a trash bin and not a promise. It is cold storage for ideas that need more foundation, clearer design, or better timing.

## Use Icebox when

- the idea is good but too early;
- the idea needs systems that do not exist yet;
- the idea is too large to implement as a single task;
- the idea may break current focus;
- the idea is atmospheric but needs validation.

## Examples for Chornolis Marches

- Mythic skill learning from spirits.
- Seasonal rituals and sacred days.
- Calendar-to-world correspondences: named weekdays or day-signs can change creature presence, omens, rumors or events, such as a frog day with more frogs and frog-linked happenings. Day names should feel Ukrainian/Slavic and local to Chornolis rather than copied from traditions such as "Thor's day".
- Caravans and regional trade networks.
- Player camps, shelters and construction.
- Full PvP bounty and witness system.
- Guard response to harmful player behavior: settlement guards or wardens should eventually react to characters who attack other characters, escalating from warning or intervention to pursuit, punishment, bounty or exile depending on witnesses, reputation and local law.
- Moon phases and deep calendar simulation.
- Web `/map`, shared map view service and future MUD-client gateway. The 0.11.5 Ukrainian alias layer is an early Telegram-side step toward MUD-like text input, but a real gateway still belongs here until account/session architecture exists.
- Personal chronicle / character memory: keep a player-specific record of what the character has seen, where they have been, which regions, locations, special signs, creatures, NPCs, objects and world events they personally witnessed, and when. This could power a later `Літопис`, journal, map memory or "where did I see that?" lookup without exposing unseen world knowledge.
- Localization / i18n: keep Ukrainian as the canonical authored language and add a real localization layer for at least English as the first secondary locale. This should cover Telegram UI, commands/help text, web/status pages, system messages, release/news text where relevant, and authored world content such as location descriptions, features and species names. Plan for grammar-sensitive strings rather than raw string replacement: Ukrainian cases, English articles/plurals, gendered creature text, quote formatting, and terminology choices should live in locale-aware helpers. Start only after the core text surfaces stabilize enough to avoid churn.
- `seedWorld()` refactor for `prisma/seed.ts`, once the current static world seed stabilizes.
- Deep bridge mechanics: bridge condition, repairs, risky crossings and links to future fishing.
- Advanced persistent automation: auto-behavior presets, safety rules, profession-aware choices and temporary delegation to companions/NPCs.
- Item durability and item lifetime: tools, clothes, weapons, containers, food, gathered materials and dropped ground items should eventually wear out, rot, break, vanish or need repair. Corpse decay already provides a foundation for location objects aging out over time.
- Dynamic lost-money trails: creatures, spirits, NPCs or fleeing characters may drop coins or small belongings while moving. Players should be able to notice the scattered finds directly or follow tracks to discover where more was dropped along the route.
- Deeper social signal reactions: the MVP signal set now exists; later work can add NPC/creature reactions, mood/reputation effects, targetless location signals and more ritual, hostile, fearful or group-play signals.
- Deep settlement/group structures such as kurінь, січ, households, sworn groups, contacts and longer-term social obligations.
- Deeper food, thirst and cooking simulation after basic hunger and water sources become useful.
- Thirst and animal water-seeking: thirst should not be a hard early pressure for player characters, but animals should eventually seek mapped water sources such as streams, springs and riverbank cells. This can make water paths good places for tracks, ambushes and trap placement.
- Opportunistic herbivore behavior after birds, carcasses and creature attack systems exist: rabbits remain herbivores by default, but may sometimes tear into small bird prey or carrion such as partridge-like game.
- Biome-specific herbivore roster for later ecology expansion:
  - forest/deep forest: squirrel, dormouse, forest mouse, roe deer, mountain hare or similar woodland hare;
  - dry luka / clearing: brown hare, field mouse, vole, possibly ground squirrel or marmot-like steppe species if the setting supports them;
  - riverbank / under-bridge wet edges: water vole, muskrat-like herbivore, later beaver as a larger map-changing animal.
- Future herbivore species should have explicit ecology weights such as grazing pressure, preferred food resources, reproduction profile, habitat affinity and migration preference.
- Future animal behavior profiles: deer and hares should be more skittish, rabbits skittish but less dramatically so, while large herbivores such as moose may defend themselves or their young and can initiate attacks despite not being predators.
- Creature-only passages and dens: fox holes, burrows or tunnels can act like location exits that are available to specific creatures but not ordinary player characters, unless the player has an exceptional form or magical transformation that makes the passage usable.
- Full den interiors: a bear's den or similar lair can be a real inside location, entered through an `INSIDE`-style exit, rather than only a surface feature.
- Weather-driven survival loops: soaked clothes, cold, firewood quality, mud, snow, heat and shelter.

## Review rhythm

Review Icebox:

- before a new minor version;
- after a major system lands;
- when planning the next roadmap phase.

For each item, decide:

- keep in Icebox;
- move to backlog;
- split into smaller items;
- close as cancelled/not planned.
