---
id: PLAN-001
title: Repository docs are the planning source of truth
status: next
type: documentation
area: planning
priority: high
estimate: 1h
tags:
  - planning
  - docs
  - roadmap
depends_on: []
---

# PLAN-001: Repository docs are the planning source of truth

## Goal

Make `docs/` the canonical source for roadmap, game design and tasks.

## First Scope

- Add or update planning index files.
- Keep GitHub Issues/Projects as mirrors only.
- Document status values and promotion rules.

## Acceptance

- `docs/planning/README.md` exists.
- `docs/roadmap.md` states docs are source of truth.
- Pure planning-only updates do not need package changes; release PRs may update `package.json` and `package-lock.json` when version, changelog, news and release notes are aligned.

## Implementation Order

Can be done independently.
