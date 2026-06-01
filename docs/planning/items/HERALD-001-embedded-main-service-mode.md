---
id: HERALD-001
title: Embedded main-service mode for Boundary Mark Chancery Herald
status: icebox
type: technical
area: ops
priority: low
tags:
  - herald
  - telegram
  - render
  - ops
  - architecture
  - icebox
depends_on: []
exports:
  github_issue: true
---

# HERALD-001: Embedded Main-Service Mode For Boundary Mark Chancery Herald

## Goal

Support a future deployment mode where the existing main Render Web Service can intentionally start both Telegram bot clients:

- the main Chornolis game bot;
- the Boundary Mark Chancery Herald bot.

The current standalone Herald entrypoint must remain supported:

```bash
node dist/apps/heraldBot.js
```

Embedded mode is a cost/service-count tradeoff, not the default architecture. It gives less runtime independence than a separate Herald Web Service, but may be useful if running a second always-on Render service is inconvenient.

## Current Post-Merge Baseline

After the Herald branch is merged, both Render services deploy from `main`:

- main game service: `node dist/bot.js`;
- standalone Herald Web Service: `node dist/apps/heraldBot.js`.

This is the supported baseline. The main game service must not require
`HERALD_*` env variables and must not start the Herald unless this future
embedded mode is explicitly implemented and enabled.

The standalone Herald service owns the current `HERALD_*` env variables,
publisher loop, startup notice and heartbeat. It may share `DATABASE_URL` with
the game service under the current outbox/status architecture.

## Scope

- Add an explicit opt-in flag such as `HERALD_EMBEDDED_ENABLED=true`.
- Keep main game service behavior unchanged unless `HERALD_EMBEDDED_ENABLED` is exactly enabled.
- Refactor Herald startup into reusable functions, for example:
  - `createHeraldBot(config)`;
  - `startHeraldBot(options)`;
  - a standalone wrapper used by `src/apps/heraldBot.ts`.
- Keep `src/apps/heraldBot.ts` working as the standalone entrypoint and do not import `src/bot.ts` from it.
- Allow the main game runtime to import the reusable Herald startup module only when embedded mode is enabled.
- Ensure Herald-only code does not start world tick, action queue, deploy announcements or gameplay handlers.
- Ensure only one process polls `HERALD_BOT_TOKEN` at a time.
- Avoid duplicate startup notices.
- Avoid duplicate publisher loops.
- Avoid duplicate outbox publication.

## Render Migration Notes

When moving from standalone Herald service to embedded mode:

1. Disable or suspend the separate Herald Render Web Service.
2. Copy required `HERALD_*` env variables to the main Chornolis Web Service.
3. Set `HERALD_EMBEDDED_ENABLED=true` on the main Chornolis Web Service.
4. Keep exactly one active polling process for `HERALD_BOT_TOKEN`.
5. Watch logs for one Herald startup notice, one heartbeat path and one publisher loop.
6. Roll back by setting `HERALD_EMBEDDED_ENABLED=false` or removing it, then re-enabling the separate Herald service.

Do not keep both the standalone Herald service and embedded Herald mode active with the same token. Telegram long polling will conflict, and duplicate publisher loops may race on the outbox.

## Acceptance

- Standalone Herald still starts with `node dist/apps/heraldBot.js`.
- Main game service behavior is unchanged when `HERALD_EMBEDDED_ENABLED` is not true.
- Embedded mode can be enabled intentionally without duplicate Telegram polling, duplicate startup notices or duplicate outbox publication.
- Docs explain the tradeoff: less independence, lower Render cost/service count.
- `npm run build` passes.
- A smoke check or focused test covers the embedded flag/default-disabled guard if practical.

## Not Now Because

The separate Herald Web Service keeps isolation clearer while the Chancery runtime is still new. Embedded mode should wait until the standalone path has proven stable and the extra Render service is the real pain point.
