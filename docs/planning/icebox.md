# Icebox

Icebox stores ideas that fit the project but should not shape near-term work.

It is not a trash bin and not a promise. It is cold storage for ideas that need more foundation, clearer design or better timing.

## Keep Cold During 0.13–0.15

- Full combat system.
- Full crafting trees.
- Full economy with regional prices.
- Caravans and regional trade networks.
- Factions, kurins, Sich-like groups and frontier politics.
- PvP bounty and witness system.
- Dynamic settlement law.
- Full crime/law consequences for theft: bounties, formal guards, punishment, restitution systems and settlement-wide legal status. The near-term theft plan should stay a risky social-action MVP, not a full law system.
- Deep shrine and ritual systems.
- Seasonal rituals and sacred days.
- Deep calendar simulation beyond the 0.14 light foundation: sacred/dangerous days, ritual calendars, local calendar variants, deep moon omens and season-specific mythic events. Minimal 28-day moon phase and moon illumination belong to 0.14 because they affect night visibility.
- Web map and multi-client/MUD gateway.
- Profile protection and client-neutral login: email/password or another recovery credential so a player can recover a character after losing Telegram access, and future MUD/web/console clients do not depend on `telegramId`.
- Animal taming and small companions: earn the trust of mice, hares or similar fragile animals so they may follow the player, requiring feeding, care and future follow/ecology foundations.
- i18n/localization layer.
- Advanced persistent automation.
- Player camps, shelters and construction.
- Pit traps and vertical hazard cells: entering a trap cell can drop a character to a real lower `z - 1` location, cause HP damage and require climbing or help to escape.
- Deep bridge mechanics.
- Large MUD-style socials catalog.
- Local LLM-assisted NPC/spirit context layer: a small local model could later help NPCs and spiritual presences answer or gesture more consciously from nearby context, what was said or shown to them, their role, memory and the current місцина. Keep this cold until authored dialogue, safety boundaries, privacy rules, tone constraints, hallucination guards, cost/performance limits and fallback behavior are designed; it should enrich authored behavior, not replace it.
- Full personal chronicle/journal system.
- Item durability and deep item lifetime.
- Deep weapon durability/sharpness: dull blades, broken hafts, whetstones, smith repairs, weapon quality, maker marks and per-instance weapon history.
- Armor, shields, parrying, dual wielding, strict hand occupancy and torch/weapon conflicts.
- Weapon crafting trees and rare weapon materials.
- Looting equipped weapons from corpses and combat drops.
- SLEEP-004: external forced sleep causes from creatures, elixirs, illness, traps or rituals.
- DREAM-004: advanced group dreams, place-spirit influence, dream conflict/appeasement and ritual dream spaces.

## Review Rhythm

Review Icebox:

- before a new minor version;
- after a major system lands;
- when planning the next roadmap phase.

For each item, decide:

- keep in Icebox;
- move to backlog;
- split into smaller items;
- close as cancelled/not planned.
