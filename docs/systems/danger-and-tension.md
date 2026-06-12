# Danger And Tension

Date: 12026-06-12
Status: 0.16.35 review note

This note defines the current model before any tuning pass. It does not change animal behavior, ecology math, combat, scheduling or database shape.

## Terms

- **Base danger** is `Location.dangerLevel`: the authored, relatively stable danger of a location. Use it when describing the location's baseline, seed/map data, admin lists or map authoring.
- **Temporary tension / local pressure** is the extra pressure layered on top of base danger for the present moment. It is not authored terrain danger.
- **Recent-attack pressure** is the temporary pressure from active `recent_attack_*` location features. It expires through the feature data already written by combat/action completion code.
- **Crowd pressure** is the temporary pressure from too many visible local presences in one location. It reflects crowding and nervousness, not the map's baseline danger.
- **Effective/current danger** is base danger plus temporary pressure. The canonical code helper is `effectiveLocationDanger(...)` in `src/services/locationDanger.ts`.

## Player And Technical Surfaces

Ordinary player-facing text should stay qualitative and diegetic. `/look` and ordinary `/examine` may hint that a place feels attentive, uneasy or dangerous, but should not show formulas or raw source tables.

Technical, scribe and admin surfaces may show raw values when that helps debugging. The canonical compact format is `locationDangerTechnicalSummary(...)`, for example:

```text
Небезпека: 1; напруга зараз: +5 (+5 від недавнього нападу); відчувається як 6
```

Use that summary instead of inventing another danger/tension display.

## Current Call-Site Inventory

- `src/services/locationDanger.ts`
  - Owns the canonical helpers for crowd pressure, recent-attack pressure, effective/current danger, technical summary text and qualitative examine cues.
- `src/services/locations.ts`
  - Uses effective/current danger for ordinary `/examine` danger cues.
  - Uses `locationDangerTechnicalSummary(...)` only when the player has technical details enabled.
  - This is the correct split: qualitative ordinary text, raw breakdown only for technical readers.
- `src/services/worldTick.ts`
  - Uses effective/current danger for herbivore reproduction pressure and creature AI caution/rest behavior.
  - This is intentional because animals should react to recent attacks and crowd pressure, not only authored terrain danger.
  - Uses `activeRecentAttackFeature(...)` for the separate herbivore movement-pressure chance. That chance is still a separate tuning surface and is not changed here.
- `src/services/actionCompletions.ts`
  - Creates active `recent_attack_*` features after player/creature attacks. This is the current source of recent-attack pressure.
- `src/handlers/status.ts`
  - Shows base `dangerLevel` in admin/status-style location rows. That is correct for map/authoring inventory because the value is the authored baseline.
- Seed and map tests (`scripts/test/world-seed.mjs`, attention/track gated tests)
  - Assert base `dangerLevel` on authored locations. These should remain base-danger checks unless a test explicitly targets current/effective danger.

## Follow-Up Boundary

Future tuning may adjust the bonus values, decay rules, source names or animal thresholds, but that should be a separate implementation PR with focused tests. This review only clarifies the model and removes helper ambiguity.
