# Backlog

Accepted ideas that fit Chornolis Marches but are not the current focus.

Backlog differs from Icebox: backlog means “we probably want this, but not right now”; Icebox means “interesting, but too early, too large, or still uncertain”.

## Current backlog themes

- Ecology balancing after first rabbit reproduction: growth rates, overgrazing severity, migration/spread and visible degradation.
- Animal hunger/starvation follow-up: increase hunger when herbivores fail to find food, kill from starvation after sustained hunger, and expose starvation counters in `/stat`.
- Weather/magic ecology hooks: rain and restoration magic should shorten exhausted-vegetation recovery.
- Day/night and light.
- Campfires and firewood.
- Early `/respawn` support.
- Starter settlement and NPCs.
- Fishing: riverbank fishing loop, fisher NPC, and learning basic fishing by watching or speaking with them.
- Basic crafting.
- Barter and trade.
- Use- and observation-based skill progression.
- Tracks, stealth and visibility.
- Admin/debug permissions for commands such as `/reset`, `/tickSet`, `/cleanupCreatures` and other dangerous tools.
- Richer auto-mode profiles and player-configurable auto behavior.
- Ukrainian interface terminology pass: `Озирнутися`, `Місцина`, `Роздивитися`, and similar diegetic wording instead of direct English/RPG calques.
- Random pre-generated Ukrainian names with database uniqueness checks.
- Name approval workflow for custom names and their case forms.
- Onboarding hardening: Ukrainian-only custom names, correct apostrophes/dashes, stripping emoji, bidi/right-to-left controls and invisible characters, and escaping user-entered names before display.
- Foraging/firewood loop: dry sticks, moss, animal bones, tiny coin finds such as шаги/ґривні, and region- or location-specific finds.
- Decide whether foraging stays separate or becomes a broader `/gather` mode with target categories.
- Debug visibility toggle through `/debugGet` and `/debugSet`, with raw technical numbers only when debug mode is enabled.
- Hide exact HP/stamina/queue/resource numbers outside debug mode and use descriptive states such as healthy, wounded, exhausted, almost unconscious.
- Collision handling for gathering, attacks, freshening and similar actions: random events, speed/skill dependence, and messages to other characters nearby.
- Refactor `src/services/actionQueue.ts`: split the large queue/orchestration file into smaller action-specific modules and clarify action completion boundaries.
- Map docs drift check: add `map:check` and CI/pre-commit coverage so changes under `prisma/data/world/` fail when `docs/world/world_map.md` was not regenerated.
- Character card expansion: name cases, name approval status, registration date/time, active play time, and current money.
- Real active time tracking for players based on actions/activity rather than account age.
- Dynamic `/time` model after the static starter date: season, moon circle/month, day and time of day should advance with world time.
- Presence reveal near campfires and later in daylight: show names/animal labels and interaction buttons immediately when visibility conditions allow it.
- Weather and weather effects on visibility, travel, gathering, tracks, rest, fire and creature behavior.
- Contacts, groups, kurені/січі or similar social organization tools.
- Combat system beyond the current simple animal attack/debug kill flow.
- Opponent assessment: approximate comparison between the player and a character, animal, monster or spirit before conflict.
- Dream tutorial after onboarding: the character sleeps and may learn basic controls in a dream, with an option to skip and wake up.
- Cowardice/flee settings: player-configurable health threshold for trying to flee combat.
- Water sources: wells, springs, streams and other places where characters can drink.
- Food and hunger system beyond the current simple debug hunger counter.

## Promotion rules

Move an item from backlog to `next` when:

- the needed foundation exists;
- the task can be broken into small implementation steps;
- it supports the current roadmap phase;
- it does not distract from the atmospheric MVP.
