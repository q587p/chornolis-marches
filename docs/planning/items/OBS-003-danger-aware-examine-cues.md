---
id: OBS-003
title: Danger-aware examine cues
status: done
type: feature
area: learning
priority: high
tags:
  - observe
  - examine
  - danger
  - ecology
  - atmosphere
depends_on:
  - OBS-PREP-001
---

# OBS-003: Danger-aware examine cues

## Goal

Make raised local danger legible to players through attentive inspection without exposing raw debug numbers.

Animals already react to raised danger pressure. Players should also be able to sense that a place has become unsafe when they spend attention on `/examine` / `Роздивитися`, especially before the full observation-learning system exists.

## First Scope

- Add a qualitative danger layer to full location examination.
- Use the existing effective local danger concept where practical: base location danger plus temporary attack/crowd/predator pressure if the shared helper can provide it.
- Keep ordinary `/look` compact; prefer `/examine` for danger atmosphere.
- Keep raw values such as `Небезпека: 1` behind technical details or scribe/debug views.
- Add several atmospheric bands instead of one fixed line, for example:
  - low raised danger: the air feels too still;
  - medium danger: there is a sharp smell or pressure in the air;
  - high danger: the place feels watched, hunted or recently disturbed.
- Later observation/visibility skill can make the cue more precise; this first slice only needs clear diegetic feedback.

## Non-Goals

- No full `/observe` command implementation in this slice.
- No new combat or fear system.
- No raw danger meter in ordinary player-facing text.
- No broad animal-behavior retuning unless the existing danger helper must be exposed for reuse.

## Acceptance

- When local danger is above the calm baseline, `/examine` of the current location includes a short atmospheric danger cue.
- The cue is qualitative and Ukrainian/player-facing, not a raw number.
- Technical details or scribe/debug views may still show exact danger values where they already do.
- Existing animal danger reactions remain intact.
- Focused tests cover at least calm/no-cue and raised-danger/cue rendering.

## Example Text Direction

```text
У повітрі тримається гострий запах неспокою. Тут недавно щось лякало живе.
```

```text
Місцина ніби стишується навколо вас: не порожня, а насторожена.
```

```text
Земля, трава й тиша складаються в одне відчуття: тут варто бути обережнішими.
```

## Notes

- This belongs near the 0.15 attention/observation lane because it teaches that careful inspection can reveal more than a location name and exits.
- The first implementation should be small and copy-focused, then later connect to observation skill, visibility, light and tracking.

## 0.15.17 Slice

Shipped a first qualitative cue layer for full location examination:

- `renderLocationDetails` now adds an atmospheric line when effective local danger rises above calm baseline.
- The helper uses base location danger, crowd pressure and recent-attack feature pressure, but player-facing text never shows raw danger numbers.
- Focused tests cover calm/no-cue, raised-danger bands, crowd pressure and recent-attack pressure.

Follow-up observation work can make these cues more precise through skill, light, tracking and distance.
