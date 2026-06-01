---
id: STAT-001
title: Web /stat predator species comparison table
status: next
type: feature
area: web
priority: medium
tags:
  - web
  - stats
  - ecology
  - predators
  - owl
  - fox
  - wolf
---

# STAT-001 — Web /stat predator species comparison table

## Summary

The Telegram `/stat` surface now shows predator performance grouped by species, and `getEcologyStats()` exposes `predatorKillRows` for `/stat.json`. The full web `/stat` HTML page should also show a dedicated species comparison table so maintainers can compare owl, fox and wolf pressure in the browser.

## Scope

- Add a distinct web `/stat` section for predator species performance.
- Show species-level rows for at least owl, fox and wolf when data exists.
- Reuse `predatorKillRows` / `getEcologyStats()` data instead of recomputing a separate query.
- Keep the existing "most successful predators" table; this new table is species comparison, not a replacement for individual hunter rows.
- Keep the table useful when a species has zero recent kills, if the current stats data can represent that cheaply.

## Out of scope

- New ecology counters.
- Rebalancing owl/fox/wolf behavior.
- Public player-facing news unless the web status surface becomes broadly public and noticeable.

## Acceptance criteria

- Web `/stat` has a clear "Predators by species" style table or Ukrainian equivalent.
- Owl, fox and wolf can be compared from the browser without opening Telegram `/stat` or raw `/stat.json`.
- The table uses existing ecology stats data and does not duplicate query logic.
- A focused web/status test covers the rendered table.

## Suggested validation

- `node scripts/test/ecology-stats.cjs`
- Focused web `/stat` rendering test, if present; otherwise add one near the status server tests.
- `npm test`
