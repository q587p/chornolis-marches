---
id: SETTLE-002
title: Gate notice board
status: backlog
type: feature
area: settlements
priority: medium
estimate: 2-4h
tags:
  - settlement
  - gate
  - notices
  - feature
  - rumors
depends_on:
  - SETTLE-001
  - LOOP-002
---

# SETTLE-002: Gate Notice Board

## Goal

Add or upgrade a diegetic notice board near the closed settlement gate so the
settlement can speak through small public notes, warnings and requests without
turning them into formal quests.

This can extend the existing gate hunting notice, but should eventually become a
broader board: one visible place where players can read what the settlement
currently cares about.

## First Scope

- Add or upgrade an inspectable `Дошка оголошень` / gate board feature near the
  settlement gate.
- Keep `/look` compact: the board appears as a feature with a short summary.
- Make `/examine` richer: show a few compact notices or a rotated selection of
  current board lines.
- Include existing gate-hunting pressure text as one possible board entry or
  adjacent pinned notice, without losing the dedicated carcass drop-off feature.
- Add aliases such as `дошка`, `оголошення`, `записка`, `notice board`, `board`.

## Possible Board Entries

- Borderland pressure / carcass drop-off reminder.
- Current stand-down wording when hunting pressure is enough for now.
- Newcomer safety note: light, camp, return paths.
- Small rumors from settlement scribes, guards, hunters or herbalists.
- Future public chronicle or Herald-derived snippets, if they remain safe and
  spoiler-light.

## Guardrails

- Do not make this a standard quest board.
- Do not add `Quest accepted`, kill counts, fixed bounties or a price table.
- Do not expose hidden routes, admin-only commands, raw event ids or exact
  spawn/resource coordinates.
- Do not replace `news.md`, Herald publications or `/chronicles`; the board is a
  local in-world surface.
- Keep text Ukrainian, compact and diegetic.

## Acceptance

- The gate has an inspectable notice board or upgraded board-like feature.
- Direct `look/examine board` and Ukrainian variants resolve to the board.
- `/look` and `/examine` are meaningfully different.
- If gate-hunting saturation is active, the board or pinned notice can reflect
  the quieter “enough for now” state.
- Tests cover feature aliases and that the board does not leak hidden/admin
  content.

## Notes

This should coordinate with `LOOP-002` so the existing hunting notice does not
become duplicated text. A good first implementation can simply move from one
static hunting sign toward a small board with one pinned hunting note and one or
two general settlement-facing notices.
