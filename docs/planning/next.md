# Next

This file should stay small. If everything is next, nothing is next.

## Current Lane

The current lane is the three-month vertical slice:

1. 0.13 - Core Loop & Onboarding Stability.
2. 0.14 - Night, Light and Firewood.
3. 0.15 - Attention and Learning MVP.

## 0.13 Next

- ONB-002: character name onboarding polish.
- ONB-001: dream tutorial compact completion.
- SURV-001: beginner return / `Повернення`.
- LOOP-001: starter location and bridge threshold polish.
- ADM-001: minimal audit logging for dangerous scribe tools.

## 0.14 Next

- WORLD-001: dawn/day/dusk/night world state.
- VIS-001: shared visibility layer.
- FIRE-001: campfire and torch visibility integration.
- HMYZ-001: find/pickup/add хмиз loop.
- MAP-002: first biome-aware foraging table.

## 0.15 Next

- LEARN-001: minimal learning storage decision.
- OBS-001: observe action and herbalist learning moment.
- TRACK-LEARN-001: track-reading / animal movement learning moment.
- OMEN-001: one small living-world omen.
- ONB-001 follow-up: tutorial hints that careful observation matters.

## Promotion candidates to review

These are still `backlog`, but recent work makes them worth reviewing before the next patch sequence.

- Inventory item actions: the dedicated inventory view exists, and the 0.12.15 drop feedback pass makes the item-instance gap more visible. Item details, safer dropped-item pickup, dream-item origin and richer per-item actions are now small enough to promote when the survival loop needs them.
- Corpse freshening and meat: the existing corpse/freshen path, hunger and campfire inventory actions are close enough to support a first raw meat -> cooked meat -> eat loop. This has been promoted to `FOOD-001`.
- Pickup/gather command semantics: `підібрати`/`take` should mean visible ground-item pickup, while `зібрати`/`gather` should mean spending time and stamina on a local resource node. This has been promoted to `ITEM-001`.
- PERF-001: runtime performance plan and creature simulation budget. Recent production logs show `/all` and large creature counts are already visible pressure points; next performance work should keep following the recorded plan.
- ADM-001: admin permissions, name approval and restricted reset hardening. A first `Писар`/admin gate exists now, so remaining near-term work is audit logging, clearer role UX, first name-review tools and closing any leftover dangerous paths.
- Speech and quick navigation commands: `glance`, `exits`, `enter`, `leave`, `/reply`, `whisper` and `shout` have shipped through `CMD-001`. Later work should move toward a shared command registry and per-command help without reopening this whole pack.
- Socialization / contacts / groups: the social planning pack is now split into `SOC-001` through `SOC-007`. Keep the implementation order conservative: `Знайомства`, follow intent, `Гурт` core, then group movement and UI polish; do not pull full factions, PvP law or automatic group combat forward.
- Hidden presence / hidden follower spirit: the planning pack is now split into `VIS-002`, `WORLD-002-hidden-spirit` and `OMEN-002`, with `docs/systems/hidden_presence.md` as the design source. Keep it as future work until the visibility and light foundations are ready; do not implement the стежник pursuit as an immediate patch.
- Darkness creature / small coin omen: this becomes much more attractive right after WORLD-001 because it explicitly depends on darkness, light and calm observation.
- TECH-001: service boundary and duplication cleanup. Keep this mostly behavior-preserving, but make it visible during patch planning because `worldTick.ts`, `status.ts`, `actionCompletions.ts`, `statusServer.ts`, `locations.ts` and `aliases.ts` are now large enough to slow safe feature work.

## Review Checklist

Before moving an item here, ask:

1. Does it support the active vertical slice?
2. Can it be implemented and tested independently?
3. Does it preserve atmosphere?
4. Does it avoid overbuilding?
5. Does it have text/alias parity if player-facing?
