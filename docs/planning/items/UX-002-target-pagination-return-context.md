---
id: UX-002
title: Target pagination return context
status: testing
type: chore
area: ux
priority: medium
tags:
  - ux
  - pagination
  - corpses
  - telegram
---

# UX-002: Target pagination return context

## Goal

When a player opens an item, corpse or target from a paginated target list, `Back` should return to the same list page that opened the detail view instead of resetting to page 1.

## Problem

Large corpse piles can span several Telegram inline pages. If a player opens one corpse from page 2 or later and then presses `Back`, returning to the first page makes repeated inspection, pickup or freshening slow and disorienting.

This was observed around corpse target lists, but the same rule should apply to any nearby target pagination that opens a detail/action view.

## Scope

- Carry the source page through target detail callbacks where practical.
- Make `Back` from corpse detail/action views return to the source page.
- Keep stale callbacks graceful: if the original target was taken, freshened, decayed or moved, return to the closest still-valid page and show an ordinary current list.
- Reuse the same pattern for other target lists if they share the helper.
- Do not add visible page numbers to ordinary target labels.

## Acceptance

- Opening a corpse from page 2 and pressing `Back` returns to page 2.
- Opening a corpse from the last page and pressing `Back` after the list shrinks returns to the nearest valid page.
- Player actions do not resurrect stale buttons for taken or decayed corpses.
- The behavior is covered by a small callback/helper regression test if the target-list helper can be tested cheaply.

## 0.13.23 Implementation Note

- Target-list callbacks now carry the source list mode and page into target detail/action views.
- The `↩️ Назад` button from a target or corpse action view returns through the same paginated `targetPage:*` callback, so rendering clamps naturally if the list shrank.
- Added a helper regression that verifies page 2 target buttons preserve their page context and that action-view Back uses it.
