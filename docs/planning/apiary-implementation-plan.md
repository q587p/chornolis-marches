# Apiary Implementation Plan

## Phase 1: Seeded Apiary Feature

Status: first slice in `0.15.19`.

- Add one old log apiary feature in the dry meadow.
- Keep it as `LocationFeatureType.LANDMARK`.
- Store apiary metadata in `feature.data`.
- Give it aliases for `бортя`, `вулик`, `пасіка`, `мед`, `віск` and `джмелі`.
- Add seed smoke coverage.

## Phase 2: Passive Bumblebee Sting Hazard

Status: first slice in `0.15.19`.

- Add `src/services/apiaryHazards.ts`.
- Trigger rare passive checks after successful movement, full location look/inspection and waiting.
- Skip passive stings at night.
- Rate-limit by player and apiary key through `WorldEvent`.
- Clamp passive damage so it cannot kill a player.
- Keep world-tick proactive checks out of the first slice.

## Phase 3: Honey And Wax

Status: backlog.

- Add `honey` and `beeswax` resources with lexicon forms.
- Decide whether honey is food, remedy ingredient, trade good, offering hook or all of these in separate later slices.
- Add deliberate hive robbery/harvest only with stock/cooldown limits and clear warning copy.

## Phase 4: Bear Honey Loop

Status: backlog.

- Add den and bear behavior only after the apiary and honey/wax loops are stable.
- Prefer visible signs and constrained local routing before combat.
- Avoid broad predator redesign.

## Risks

- Notification spam: passive hazards need cooldown-first tuning.
- HP pressure: passive stings are damage, but must remain survivable in MVP.
- Schema drift: stay with `LocationFeature.data` and `WorldEvent` until multiple hazards prove they need durable per-player state.
