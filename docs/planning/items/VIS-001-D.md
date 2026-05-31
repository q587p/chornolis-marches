---
id: VIS-001-D
title: Track visibility gate
status: testing
type: feature
area: visibility
priority: medium
estimate: 1-2h
tags:
  - visibility
  - tracks
  - night
depends_on:
  - VIS-001-B
---

# VIS-001-D: Track visibility gate

## Goal

Make tracks harder or impossible to read in darkness without light.

## First Scope

- Use visibility helper for `/track` and track examination.
- Provide atmospheric refusal/limited text.

## Acceptance

- Tracks respect day/night/light.
- No raw debug text.

## Implementation Order

Do after: `VIS-001-B`.

## 0.14.5 Slice

- Location rendering now hides/reduces track hints and track buttons when visibility is dim/dark without local light.
- Queued `/track` completion checks the same visibility helper before showing track details.
- The refusal path uses atmospheric Ukrainian copy instead of raw visibility/debug text.
