---
id: SURV-002
title: Death locations and lethal hazard pacing
status: backlog
type: feature
area: survival
priority: medium
estimate: 2-4h
tags:
  - death
  - hazards
  - locations
  - survival
  - world
depends_on:
  - SURV-001
---

# SURV-002: Death Locations And Lethal Hazard Pacing

## Goal

Define and implement the first safe framework for authored locations or exits that can kill a character, either instantly or slowly, without making the world feel arbitrary.

This is about dangerous places, not ordinary combat or hunger. It should let future map content include cliffs, deep water, sealed places, poisonous air, fire, frost, cursed ground or other lethal environmental pressure with clear authoring rules.

## Two Hazard Shapes

### Instant death locations

Instant death should be rare, authored and strongly signposted.

Possible examples:

- stepping beyond a clearly fatal edge;
- being swept into an impossible current after choosing an explicit risky action;
- entering a sealed/forbidden one-way death space after multiple warnings;
- admin/debug-only kill zones for testing, never on ordinary player routes.

Rules:

- Do not trigger instant death from a normal beginner path.
- Prefer an explicit player action or a clearly marked exit over passive entry.
- Send a short final atmospheric message before applying death/respawn handling.
- Create a technical `WorldEvent` marker for audit/debug.
- Make sure death handling, inventory/held items, active actions and follow intent are either preserved, cleared or documented.

### Slow death locations

Slow lethal places should give players time to understand and respond.

Possible examples:

- deep cold or heat;
- poisonous fog;
- smoke-filled cellar;
- flooded place where stamina/HP erode;
- cursed ground that worsens with every tick while the character remains.

Rules:

- Apply pressure over ticks or action completions, not as a surprise one-shot.
- Warn before serious damage begins.
- Surface recovery routes where practical: leave, rest elsewhere, light/fire, medicine, help from another character, tool use or future skill checks.
- AFK/end-session behavior must be explicit: either pause, continue with strong warnings, or prevent entering such places while ended/AFK.
- Player-facing copy should describe the body/world response, not raw hazard math.

## Authoring Model

Prefer a small data-driven hazard layer on location/exit/feature data before hardcoding one-off checks:

- `hazard_key`;
- `hazard_kind`: `instant_death` or `slow_death`;
- `trigger`: entry, explicit action, tick, failed exit, feature interaction;
- `severity`;
- optional `requires_confirmation` or warning state;
- optional escape/recovery hint text;
- technical source/destination metadata for audit.

If the first slice uses only one hardcoded location, keep the code shaped so it can move toward the authored hazard fields later.

## Player-Facing Direction

Instant example:

```text
Стежка тут не закінчується, вона обривається. Ви встигаєте зрозуміти це лише тоді, коли земля забирає останню опору.
```

Slow example:

```text
Повітря тут важке й гірке. Спершу воно лише дряпає горло, але тіло вже просить вийти звідси.
```

Escalation example:

```text
Кожен вдих стає коротшим. Якщо лишитися тут довше, Порубіжжя не буде сперечатися з вашим тілом.
```

## Guardrails

- No unavoidable lethal locations in tutorial dreams or starter infrastructure.
- Do not use instant death as ordinary punishment for curiosity.
- Give at least one visible clue, warning, confirmation, learned clue or explicit risky verb before lethal outcomes.
- Do not let ordinary hidden exits become automatic death traps without prior clueing.
- Make scribe/admin diagnostics show why and where the death happened without exposing hidden routes to ordinary players.
- Add tests for every authored lethal location.

## Related Tasks

- `RIVER-001`: bridge jump/current hazard can be a survivable or near-lethal prototype.
- `ICE-005`: pit traps and vertical hazard cells are related, but should not become unavoidable death cells.
- `FOOD-005`: hunger consequences are slow survival pressure, not location-based lethal hazards.

## Acceptance

- The system distinguishes instant lethal hazards from slow lethal pressure.
- Instant death requires explicit authoring and strong signposting.
- Slow death warns before serious damage and offers some route to escape or recover.
- Player death/knockout/respawn integration is documented before any public lethal location ships.
- Tests cover hazard trigger, warning cadence, death/audit event and safe beginner exclusions.
