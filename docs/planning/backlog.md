# Backlog

Accepted ideas that fit Chornolis Marches but are not the current focus.

Backlog differs from Icebox: backlog means "we probably want this, but not right now"; Icebox means "interesting, too early, too large or not yet validated."

## Near-Term Backlog

These may become `next` after 0.13-0.15 foundations land.

- Starter settlement skeleton beyond the closed gate.
- First useful NPC roles: guard, hunter, herbalist, fisher.
- Ground money and small find objects beyond the first omen.
- Local pickup/gather observer feedback beyond хмиз, after `ITEM-001` clarifies pickup versus gather command semantics.
- Bulk ground pickup text commands such as `підібрати все` / `take all`, with clear ordering, visibility checks and item limits.
- Richer butchering outputs after `FOOD-001`: species-specific meat, bones, hide, fur, feathers, tools, skill-based yield and spoilage.
- Animal-restoration charm or small offering loop.
- NPC hunter/archer route that leaves visible signs.
- Local console client for command/action smoke tests.
- Shared command registry and per-command help: keep `/commands`, `/help`, text aliases, future MUD commands, Telegram buttons and permissions from drifting apart.
- Follow-up command packs after `CMD-001`: `give`, `put`, `drink`, `skills`, `effects`, `consider`, `compare`, `journal`, `party`, `guild`, `spells`, `cast`, `weather`, builder commands and moderation commands.
- Item details, safer drop/pickup and item-instance groundwork.
- Dream item origin tracking for tutorial resources, so leaving the dream removes only dream-gathered supplies and never resources brought from the waking world.
- Reply UX for addressed speech is now part of `CMD-001`; later polish can add inline reply buttons and generated answer options.
- Wider prepared-name pool and DB-backed name registry.
- More biome-specific resources and animals.
- Public diegetic ecology notes through inspectable signs.
- Budgeted creature simulation if production load demands it.

## Technical Backlog

- Continue behavior-preserving service boundary cleanup.
- Extract visibility and world-time helpers away from handlers.
- Split broad completion logic only when feature work touches it.
- Keep action aliases and Telegram buttons moving toward a shared action registry.
- Add map/docs drift checks after map data stabilizes.

## Promotion Rules

Promote to `next` only when:

- the needed foundation exists;
- the task is 1-2 hours or split smaller;
- it supports the current roadmap phase;
- it has a clear acceptance checklist;
- it does not distract from atmosphere and readable consequences.
