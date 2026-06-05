---
id: TRACK-LEARN-001-A
title: Track-examine progress hint
status: in_testing
type: feature
area: learning
priority: high
estimate: 1-2h
tags:
  - tracking
  - tracks
  - progression
depends_on:
  - LEARN-001-C
  - VIS-001-D
---

# TRACK-LEARN-001-A: Track-examine progress hint

## Goal

Let careful examination of fresh tracks teach a tiny tracking hint.

## First Scope

- Use fresh visible tracks.
- Grant small progress or event note.
- Show diegetic text.

## Acceptance

- Fresh readable tracks can teach once in a while.
- Darkness/light gates apply.
- No raw track debug math.

## Implementation Order

Do after: `LEARN-001-C`, `VIS-001-D`.

## Foundation Note

Use `src/services/learning.ts` and `CharacterLearningProgress` from the
`LEARN-001` foundation. Track-reading progress should not invent separate
storage.

## 0.15.43 Implementation Note

`0.15.43` makes executed `Сліди` (`/track`) a canonical practice source:

- normal searches write `tracking` / `practice` / `track_search`;
- detailed track inspection writes `tracking` / `practice` / `track_detail`;
- successful use of the small track-gated grass-run passage can write
  `tracking` / `practice` / `track_gate`;
- stored tracking progress can improve output quality in small bounded ways:
  rough age labels, a capped result-count increase and a higher-skill darkness
  hint that does not reveal direction.

This intentionally does not add auto-follow, hidden-route replay, tracking
through darkness, public `/skills` or combat use.
