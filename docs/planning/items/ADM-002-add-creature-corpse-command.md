---
id: ADM-002
title: Scribe creature corpse creation command
status: testing
type: feature
area: admin
priority: medium
tags:
  - admin
  - creatures
  - corpses
  - testing
---

# ADM-002: Scribe creature corpse creation command

## Goal

Add a scribe-only command for creating animal corpses directly, shaped like `/addCreature`, so live testing can set up carcass, freshening, predator, drop-off and decay scenarios without first spawning and killing animals.

## Proposed Command

Use a `/addCreatureCorpse` command with syntax close to `/addCreature`:

```text
/addCreatureCorpse <speciesKey> [locationKey|x,y,z] [count] [YOUNG|ADULT|OLD] [fresh|decaying|old]
```

Defaults:

- No location: current scribe location.
- No count: 1.
- No age: `ADULT`.
- No freshness: fresh corpse with the species default corpse timer.

## Scope

- Gate the command behind the same scribe/admin checks as `/addCreature`.
- Reuse `/addCreatureHelp` species keys or extend help text so the available keys are easy to find.
- Support batching and the same visible maximum-count guard as `/addCreature`.
- Set creature rows directly to corpse state: `isAlive=false`, `age=CORPSE`, `hp=0`, location set, corpse decay initialized from the chosen freshness.
- Keep player-facing news clean: this is a scribe/admin tool and should be documented in `/adminHelp`, `/adminMenu` and admin docs, not public patch news.

## Acceptance

- `/addCreatureCorpse mouse` creates one fresh mouse corpse in the scribe's current location.
- `/addCreatureCorpse rabbit forest_04_00 3 OLD` creates three old-rabbit corpses at that location.
- Larger counts are created in safe batches instead of silently truncating.
- The command appears in `/adminHelp`, `/adminMenu`, `docs/systems/admin_commands.md` and the relevant scribe audit notes.
- Ordinary players cannot run it.
- Tests cover parsing defaults, batching and access denial.

## 0.13.23 Implementation Note

- Added the scribe-only `/addCreatureCorpse` command with current-location defaults, corpse freshness presets and the same batching/cap behavior as `/addCreature`.
- Added it to `/adminHelp`, the `🐾 Істоти` admin submenu, admin command docs and scribe audit notes.
- Covered parser defaults, uppercase `OLD` age handling and corpse freshness decay helper behavior in focused tests.
