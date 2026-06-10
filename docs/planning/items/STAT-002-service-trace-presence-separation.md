---
id: STAT-002
title: Service trace presence separation
status: backlog
type: polish
area: admin
priority: medium
estimate: 1h
tags:
  - admin
  - status
  - totems
  - visibility
---

# STAT-002: Service Trace Presence Separation

## Goal

Keep technical trace actors such as `strange_totem_trace` out of the living-world "Особливі присутності" admin/status block.

These traces are useful for diagnostics and debugging, but they should not read as if they are ordinary visible people, animals, spirits or local presences beside Lisovyk, herbalists, hunters or other world actors.

## First Scope

- Audit the admin/status surface that renders "Особливі присутності".
- Identify service-only trace actors that are currently visible there, starting with `strange_totem_trace`.
- Move those entries into a separate technical block, likely framed as `службові сліди`, or hide them from the living-world presence summary if a separate block would add clutter.
- Preserve any diagnostic value needed by scribes/admins.
- Keep ordinary animals, locals, specialists, Lisovyk and other living-world presences unchanged.

## Acceptance

- `strange_totem_trace` no longer appears beside ordinary world actors in "Особливі присутності".
- Scribe/admin diagnostics still have a way to notice relevant service traces when that is useful.
- No player-facing `/look`, `/examine`, totem spawn, totem dismantle or strange-totem behavior changes.
- Tests or source-level assertions cover the service-trace filtering/separation if the rendering helper is easy to isolate.

## Out Of Scope

- No strange-totem gameplay changes.
- No broad admin/status redesign.
- No new public UI for hidden service traces.
- No Prisma schema or migration changes.
