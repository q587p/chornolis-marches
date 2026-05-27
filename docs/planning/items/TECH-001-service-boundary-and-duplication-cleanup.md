---
id: TECH-001
title: Service boundary and duplication cleanup
status: backlog
type: technical
area: architecture
priority: medium
tags:
  - architecture
  - refactor
  - maintainability
  - services
exports:
  github_issue: true
---

# TECH-001: Service boundary and duplication cleanup

## Goal

Keep the codebase easy to change as Chornolis grows from a Telegram-first bot into a reusable game core with web, admin and possible MUD-facing surfaces.

The current code is still workable, but several files are large enough that related concerns are starting to mix:

- `src/services/worldTick.ts` combines ecology, reproduction, creature AI, lisovyk behavior, timers and runtime tick commands.
- `src/handlers/status.ts` combines Telegram `/stat`, `/who`, `/all`, `/chat`, admin character cards, NPC cards and admin actions.
- `src/services/actionCompletions.ts` handles many unrelated action completion flows in one file.
- `src/server/statusServer.ts` mixes route handling, HTML rendering and admin-gated pages.
- `src/services/locations.ts` mixes location data loading, visibility, feature text, resource buttons, target lists and fire/torch feature actions.
- `src/handlers/aliases.ts` is becoming a second command router for Ukrainian/MUD-style input.

## First scope

- Continue extracting tiny shared helpers when duplication is obvious and behavior-preserving.
- Split pure formatting/rendering helpers away from handlers before changing behavior.
- Keep side-effecting gameplay rules in services, not in Telegram/web adapters.
- Prefer small files with clear ownership over one broad `utils` dumping ground.
- Add brief comments only at boundaries where a future maintainer could accidentally change gameplay behavior while moving code.

## Candidate extractions

- `worldTick.ts`:
  - ecology/reproduction pressure;
  - predator reproduction;
  - animal lifecycle and corpse decay;
  - creature AI decision ticks;
  - lisovyk wake/sleep/restoration;
  - runtime tick command/status text.
- `status.ts`:
  - admin character/NPC detail card rendering;
  - `/chat` Telegram page rendering;
  - `/all` and `/locationAll` pagination helpers;
  - stat brief formatting.
- `statusServer.ts`:
  - reusable HTML shell/styles;
  - chat page rendering;
  - stat page rendering;
  - admin secret gate.
- `locations.ts`:
  - feature description/rendering;
  - visible target lists;
  - resource/gather button rendering;
  - fire/torch feature actions.
- command/action wiring:
  - move Telegram buttons, slash commands and Ukrainian text aliases toward a shared command/action registry.

## Acceptance notes

- Refactors should keep `npm run build` green and preserve current player-facing wording unless a release explicitly changes it.
- Extracted modules should be covered by existing build/tests first; behavioral changes can come in later patches.
- Public news/changelog should mention only meaningful user/admin-facing outcomes, not every file split.
