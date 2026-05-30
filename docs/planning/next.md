# Next

This file should stay small. If everything is next, nothing is next.

## Current Lane

The current lane is the three-month vertical slice:

1. 0.13 - Core Loop & Onboarding Stability.
2. 0.14 - Night, Light and Firewood.
3. 0.15 - Attention and Learning MVP.

## 0.13 Next

- REL-001: keep release/patch work on a separate branch with a PR into `main`, including summary, validation and risk notes.
- SES-001: add AFK / End Session controls, silent Auto-AFK after player inactivity, one idle reminder per scene and send-time guards for delayed/proactive messages so the bot stays quiet while a player is away.
- ONB-002: character name onboarding polish.
- ONB-001: dream tutorial compact completion.
- SURV-001: beginner return / `Повернення`.
- LOOP-001: starter location and bridge threshold polish.
- NPC-004: continue actor inventory and held-light foundation after the 0.13.13 `CreatureResource` torch slice; next work is broader item/carry semantics and fewer remaining `currentAction` bridges.
- NPC-005: add NPC hunger and food behavior so hunters and herbalists can eat through shared survival/inventory rules.
- NPC-002: finish the hunter auto-program MVP after the first state-machine slice: real torch bundle/light state via `NPC-004`, inspect/check beat, route/radius tuning and recovery rules for claimed carcasses.
- ECO-003: tune gate-hunting saturation after the first 0.13.12 slice; the sign, rewards and hunter stand-down behavior exist, but thresholds, persisted linger/cooldown, per-tick saturation caching for larger hunter counts, and the temporary plain `/put` default still need follow-up.
- ECO-004: add a quiet population-floor restoration safeguard so ordinary animal species that drop to zero return to their starter population at starter locations; richer spirit/migration recovery remains later.
- ECO-005: add a first animal-restoration offering loop where inspectable hare/mouse charms or small капища accept fitting gifts such as herbs and berries, then later help critically low prey populations recover without becoming a spawn shop.
- LOOP-003: tune old campfire memory omens after the first small reveal slice; future work can add more authored locations and traces without turning it into a ritual/reward system.
- NPC-003: extract herbalist behavior into its own service layer, shaped like the hunter service, before adding more visible herbalist/learning behavior.
- MAP-003: expand the playable waking-world map with new reachable locations, region growth and enough authored features/resources that active players have fresh ground to explore.
- WPN-001: minimal weapon catalog and equip/unequip foundation; keep it tied to existing resource inventory and do not start full combat.
- WPN-002: weapon-aware look/examine/freshen/attack text; require a sharp equipped weapon for freshening, but keep current target eligibility.

## 0.14 Next

- WORLD-001: dawn/day/dusk/night world state.
- VIS-001: shared visibility layer.
- FIRE-001: campfire and torch visibility integration.
- HMYZ-001: find/pickup/add хмиз loop.
- MAP-002: first biome-aware foraging table.
- SLEEP-001: lying posture and `/lie` / `лягти` / `лежати` command.
- SLEEP-002: ordinary sleep MVP with `/sleep`, `/wake`, stronger recovery and `/sleep tutorial` separation.

## 0.15 Next

- LEARN-001: minimal learning storage decision.
- OBS-001: observe action and herbalist learning moment.
- TRACK-LEARN-001: track-reading / animal movement learning moment.
- OMEN-001: one small living-world omen.
- ONB-001 follow-up: tutorial hints that careful observation matters.

## Promotion candidates to review

These are still `backlog`, but recent work makes them worth reviewing before the next patch sequence.

- Sleep and dreams: after SLEEP-001/SLEEP-002 land, review SLEEP-003 and DREAM-001 so world-time auto-waking and sleeping-body/dream-presence separation do not drift away from the tutorial dream work.
- Inventory item actions: the dedicated inventory view exists, and the 0.12.15 drop feedback pass makes the item-instance gap more visible. Item details, safer dropped-item pickup, dream-item origin and richer per-item actions are now small enough to promote when the survival loop needs them.
- Corpse freshening and meat: the existing corpse/freshen path, hunger and campfire inventory actions are close enough to support a first raw meat -> cooked meat -> eat loop. This has been promoted to `FOOD-001`.
- Weapons as tools: WPN-001/WPN-002 are small enough to promote because they reuse current resource inventory, target descriptions and queued `ATTACK`/`FRESHEN` actions. Keep them as a utility/display layer; do not pull WPN-004 durability or WPN-ICE-001 deep combat forward.
- Pickup/gather command semantics: `підібрати`/`take` should mean visible ground-item pickup, while `зібрати`/`gather` should mean spending time and stamina on a local resource node. This has been promoted to `ITEM-001`.
- PERF-001: runtime performance plan and creature simulation budget. Recent production logs show `/all` and large creature counts are already visible pressure points; next performance work should keep following the recorded plan.
- ADM-001: admin permissions, name approval and restricted reset hardening. A first `Писар`/admin gate exists now, so remaining near-term work is audit logging, clearer role UX, first name-review tools and closing any leftover dangerous paths.
- Speech and quick navigation commands: `glance`, `exits`, `enter`, `leave`, `/reply`, `whisper` and `shout` have shipped through `CMD-001`. Later work should move toward a shared command registry and per-command help without reopening this whole pack.
- Socialization / contacts / groups: the social planning pack is now split into `SOC-001` through `SOC-007`. Keep the implementation order conservative: `Знайомства`, follow intent, `Гурт` core, then group movement and UI polish; do not pull full factions, PvP law or automatic group combat forward.
- Hidden presence / hidden follower spirit: the planning pack is now split into `VIS-002`, `WORLD-002-hidden-spirit` and `OMEN-002`, with `docs/systems/hidden_presence.md` as the design source. Keep it as future work until the visibility and light foundations are ready; do not implement the стежник pursuit as an immediate patch.
- Darkness creature / small coin omen: this becomes much more attractive right after WORLD-001 because it explicitly depends on darkness, light and calm observation.
- TECH-001: service boundary and duplication cleanup. Keep this mostly behavior-preserving, but make it visible during patch planning because `worldTick.ts`, `status.ts`, `actionCompletions.ts`, `statusServer.ts`, `locations.ts` and `aliases.ts` are now large enough to slow safe feature work.
- WEB-002: independent status site and deploy visibility. The current game-hosted status pages can report runtime state once the app is up, but a separate out-of-band page should survive failed builds/deploys and explain how to contact someone when the game service itself is unavailable.
- Gate hunting loop: 0.13.7 adds the notice, падальний рів, narrow `put` flow and player contribution accounting. `NAV-001`, the 0.13.9 NPC drop-off helper, the 0.13.10 hunter route plan and the 0.13.11 first hunter state-machine slice now exist, so the next small slice should focus on `NPC-004` real NPC-held torch/light state, `ECO-003` enough-for-now saturation, and better hunter route tuning rather than a second hidden counter.

## Review Checklist

Before moving an item here, ask:

1. Does it support the active vertical slice?
2. Can it be implemented and tested independently?
3. Does it preserve atmosphere?
4. Does it avoid overbuilding?
5. Does it have text/alias parity if player-facing?
