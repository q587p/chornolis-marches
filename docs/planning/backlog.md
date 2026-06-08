# Backlog

Accepted ideas that fit Chornolis Marches but are not the current focus.

Backlog differs from Icebox: backlog means "we probably want this, but not right now"; Icebox means "interesting, too early, too large or not yet validated."

## Near-Term Backlog

These may become `next` after 0.13-0.15 foundations land.

- Starter settlement skeleton beyond the closed gate.
- MAP-WILLOW-002: under-bridge and watchtower integration for the Willow Floodplain pocket, keeping the under-bridge place distinct and the settlement gate closed.
- QA-WILLOW-002: post-merge smoke for Willow feature inspect aliases, `/cook_all`, eat-all, `/all`, `/shout` and animal movement near vertical exits; include an admin cleanup plan for stranded upper-level creatures if needed.
- RIVER-001: risky bridge/river jump action, where the current can carry a wounded or unconscious character downstream instead of acting like safe travel.
- First useful NPC roles: guard, hunter, herbalist, fisher. Herbalist now has a first visible cellar supply-run MVP in testing; deeper inventory, storage, food and profession scheduling remain backlog.
- NPC-008: starter supply guards and watched beginner stores, so the watchtower/cache area feels maintained when animals or careless characters disturb beginner-critical supplies.
- LOOT-001 follow-up after the `0.15.16` money MVP: richer authored small finds, empty-search atmosphere, item lifetime and future offering hooks around starter-adjacent or calm locations, so early searching is not limited to defending distant forest resource spots.
- Ground money and small find objects beyond the first `shah` MVP should keep folding into `LOOT-001` before becoming a separate economy system.
- APIARY-004 and apiary follow-ups after `0.15.19` / `0.15.20`: keep the bear honey loop, honey/wax food/remedy/offering/crafting uses, trade value, shop/barter hooks and deeper bumblebee consequences visible here, including a disturbed-hive danger pass where recently troubled bees become much more aggressive for a while. Do not promote these before the `LEARN` / `OBS` foundation. The first old log apiary, passive sting hazard and honey/beeswax raid are in testing as the current apiary endpoint.
- Local pickup/gather observer feedback beyond хмиз, after `ITEM-001` clarifies pickup versus gather command semantics.
- Bottles, herbalism and first prepared remedies: add a hidden-but-safe root-pocket bottle source, a reusable `empty_bottle` resource, a minimal resource recipe helper, a first stamina-restoring herbal tincture, and later a herbalist NPC brewing demonstration. Keep healing/night-sight draughts, wetland reagents such as `willow_bark`, dirty-bottle washing, water/thirst and potion economy as separate follow-ups.
- Richer butchering outputs after `FOOD-001`: species-specific meat, bones, hide, fur, feathers, tools, skill-based yield and spoilage.
- WPN-003: themed NPC weapons and hunter spear polish after WPN-001/WPN-002 land; hunters carry spears and knives, herbalists/знахарі carry sickles, players start with a plain knife.
- Weapon follow-up after the MVP: item inspect text, clearer command help/examples for existing `equip` / `unequip` / `wield` / `unwield` aliases, and safer dropped-weapon pickup. The first legacy starter-knife backfill is handled by the freshening compatibility grant in 0.14.15.
- Weapon/torch hand-slot follow-up: make visible hands coherent when a player has lit torches and an equipped weapon. One torch plus a knife/spear/tool is acceptable for now; two lit torches should occupy both hands and force a held weapon/tool back to inventory or require an explicit put-away choice. Freshening should be able to auto-ready a carried sharp tool when hands allow it, while manual `equip` / `unequip` / `wield` / `unwield` remains available.
- Weapon-aware butchering/freshening polish after `FOOD-001`: tool quality affects text first, then later yield; do not implement durability here.
- First weapon-learning hooks: using a spear teaches spear handling later; using a knife for freshening may feed hunting/butchering learning after progression storage is ready.
- NPC hunter/archer route that leaves visible signs.
- ANIMAL-001: directed speech reactions for animals: mice may flee, foxes may react warily, wolves may growl and eventually escalate if provoked.
- ECO-008: rare, guarded carrion and mouse-cannibalism pressure for starving or stressed prey animals, after performance safeguards and corpse ownership rules are ready.
- ECO-009: seasonal ecology and environment variation, so lunar circles and seasons can later affect resources, animal behavior, local work rhythms and `look` / `examine` atmosphere without becoming a full simulation too early.
- Local console client for command/action smoke tests.
- Shared command registry and per-command help: keep `/commands`, `/help`, text aliases, future MUD commands, Telegram buttons and permissions from drifting apart.
- CMD-004: shrink `/help` to the minimal useful beginner surface and rewrite `/commands` as the current grouped command reference, with admin/scribe-only commands kept in `/adminHelp`.
- Follow-up command packs after `CMD-001`: `give`, `put`, `drink`, `skills`, `effects`, `consider`, `compare`, `journal`, `party`, `guild`, `spells`, `cast`, `weather`, builder commands and moderation commands.
- CRAFT-001: craftable placeable chests as local containers, after generic `put`/container semantics are stable enough.
- PROG-006: chronicle registration backfill, local arrival messages and a scribe/admin real-time event view.
- Deferred private-message delivery for `whisper` / addressed speech while a player is AFK or has ended the session: store a capped queue and deliver a compact recap only when they return.
- Web `/chat` filtering for automatic character/NPC lines: add a mode or toggle that hides automated world speech and shows only real player communication for review and moderation.
- HERALD-002: stronger Herald outbox idempotency/locking so a Telegram-send success followed by a DB marking failure cannot blindly repost a pending publication later.
- HERALD-003: Herald relay for public chronicle entries into a configured Telegram chat/channel, with idempotency and backfill-spam guards.
- HERALD-004: scheduled Herald check for deployed `news.md` entries that still need admin review, with compact previews and suggested manual publish/queue commands but no automatic publication.
- Item details, safer drop/pickup and item-instance groundwork.
- Dream item origin tracking for tutorial resources, so leaving the dream removes only dream-gathered supplies and never resources brought from the waking world.
- Reply UX for addressed speech is now part of `CMD-001`; later polish can add inline reply buttons and generated answer options.
- Wider prepared-name pool and DB-backed name registry.
- More biome-specific resources and animals.
- Public diegetic ecology notes through inspectable signs.
- Budgeted creature simulation if production load demands it.
- SLEEP-003: world-time automatic waking and first sleep comfort modifiers.
- SLEEP-005: ordinary sleep passive UX review for `/me`, inventory / `Речі`, and queue view. The current strict block is an intentional first safety policy; later decide whether any read-only views should work while asleep.
- DREAM-001: sleeping-body and dream-presence separation for tutorial/lucid dreams.
- DREAM-002: lucid dream instance MVP for solo and later group dreams.
- DREAM-003: dream outcomes, knowledge flags and guarded rare item transfer.

## Technical Backlog

- Continue behavior-preserving service boundary cleanup.
- LANG-001: move duplicated corpse/resource display names and aliases toward lexicon/grammar-backed helpers, especially `corpses.ts` and inventory resource paths that currently repeat per-species or per-sex strings.
- TECH-002: add location feature archetypes / world-data deduplication so repeated authored defaults such as Strange Totem icons, aliases, twig yield data and static top-level fields can live in one reusable template with per-instance overrides.
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
