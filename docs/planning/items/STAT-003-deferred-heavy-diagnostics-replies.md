---
id: STAT-003
title: Deferred replies for heavy status diagnostics
status: backlog
type: feature
area: status
priority: medium
tags:
  - status
  - diagnostics
  - responsiveness
  - telegram
depends_on:
  - PERF-001
---

# STAT-003 -- Deferred Replies For Heavy Status Diagnostics

## Goal

Let heavy status commands acknowledge immediately, then send detailed data later
when the database/status work is ready.

Candidate commands include `/stat`, `/stat_species`, `/world`, `/all`,
`/queueDebug` and similar admin/scribe diagnostics that can be slow under load.

## Candidate Behavior

- The initial reply is immediate and short, for example: "Ви запитали
  статистику; Писарі вже розгортають книги."
- The detailed response is sent asynchronously after the heavy query/render
  finishes.
- While the detail is being prepared, the player/admin can continue ordinary
  commands instead of waiting on the chat response path.
- If the detailed response fails, send a compact failure note without exposing
  SQL, secrets, chat ids, payloads or private text.

## Guardrails

- Do not change the actual statistics, ecology counters or diagnostic content in
  this slice.
- Do not make public player commands leak scribe/admin-only diagnostics.
- Keep `/health` lightweight; do not route readiness through deferred diagnostics.
- Keep command-specific access checks before queuing any deferred diagnostic
  work.
- Deduplicate or rate-limit repeated heavy requests so one admin cannot queue an
  unbounded diagnostic backlog.

## Acceptance

- At least one heavy command, preferably `/stat_species` or `/world`, sends an
  immediate acknowledgement and later sends the detailed result.
- Existing command permissions and visible content are preserved.
- Tests cover acknowledgement, deferred delivery success, failure text,
  permission guardrails and repeated-request throttling.
