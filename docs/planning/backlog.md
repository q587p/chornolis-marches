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
- WPN-003: themed NPC weapons and hunter spear polish after WPN-001/WPN-002 land; hunters carry spears and knives, herbalists/знахарі carry sickles, players start with a plain knife.
- Weapon follow-up after the MVP: text aliases for `equip`, `unequip`, `wield`, `зняти`, `взяти ніж`, item inspect text, safer dropped-weapon pickup, and starter-knife backfill for older characters if not handled in WPN-001.
- Weapon-aware butchering/freshening polish after `FOOD-001`: tool quality affects text first, then later yield; do not implement durability here.
- First weapon-learning hooks: using a spear teaches spear handling later; using a knife for freshening may feed hunting/butchering learning after progression storage is ready.
- Animal-restoration charm or small offering loop.
- NPC hunter/archer route that leaves visible signs.
- Local console client for command/action smoke tests.
- Shared command registry and per-command help: keep `/commands`, `/help`, text aliases, future MUD commands, Telegram buttons and permissions from drifting apart.
- Rework `/commands` into a cleaner hidden command reference instead of a broad alias wall: group it by real player goals, keep survival advice in `/help` or tutorial surfaces, and document which commands are current, planned or scribe-only.
- Follow-up command packs after `CMD-001`: `give`, `put`, `drink`, `skills`, `effects`, `consider`, `compare`, `journal`, `party`, `guild`, `spells`, `cast`, `weather`, builder commands and moderation commands.
- Item details, safer drop/pickup and item-instance groundwork.
- Dream item origin tracking for tutorial resources, so leaving the dream removes only dream-gathered supplies and never resources brought from the waking world.
- Reply UX for addressed speech is now part of `CMD-001`; later polish can add inline reply buttons and generated answer options.
- Wider prepared-name pool and DB-backed name registry.
- More biome-specific resources and animals.
- Public diegetic ecology notes through inspectable signs.
- Budgeted creature simulation if production load demands it.
- SLEEP-003: world-time automatic waking and first sleep comfort modifiers.
- DREAM-001: sleeping-body and dream-presence separation for tutorial/lucid dreams.
- DREAM-002: lucid dream instance MVP for solo and later group dreams.
- DREAM-003: dream outcomes, knowledge flags and guarded rare item transfer.

## Technical Backlog

- Continue behavior-preserving service boundary cleanup.
- Extract visibility and world-time helpers away from handlers.
- Split broad completion logic only when feature work touches it.
- Keep action aliases and Telegram buttons moving toward a shared action registry.
- Add map/docs drift checks after map data stabilizes.
- Keep posture, sleep state and dream instance state separate in services and persistence.
- Keep weapon behavior behind `src/services/weapons.ts` rather than scattering key checks through handlers.
- When item instances are promoted, migrate equipped weapons from aggregate resource keys to equipped item instance ids.

## Promotion Rules

Promote to `next` only when:

- the needed foundation exists;
- the task is 1-2 hours or split smaller;
- it supports the current roadmap phase;
- it has a clear acceptance checklist;
- it does not distract from atmosphere and readable consequences.
