---
id: CAT-002
title: Camp boundary and vertical movement for the spirit cat
status: next
type: feature
area: movement
priority: medium
tags:
  - cat
  - camp
  - movement
  - vertical
  - boundary
---

# CAT-002 — Camp boundary and vertical movement

## Summary

Keep the spirit cat inside camp while allowing it to move up/down within camp-linked vertical nodes and flee downward when startled.

## Scope

- Define allowed camp locations/tags for the cat.
- Prevent ordinary movement from selecting exits outside camp.
- Add safe correction if the cat is somehow outside camp.
- Let the cat use camp-linked `up` routes: roof, beam, shelf, tree/perch, high stone.
- Let the cat use camp-linked `down` routes: under bench, under platform, dry hollow, cellar/niche.
- Add flee-down preference when shooed, startled or interrupted.

## Out of scope

- Flight/perching system for all animals.
- Full pathfinding overhaul.
- Following players.

## Acceptance criteria

- The cat never leaves camp through normal world ticks.
- The cat can move to allowed up/down camp nodes.
- `SHOO`/`WAVE_OFF` or equivalent interruption sends it to a safe down/away camp node when one exists.
- If no vertical node exists, the cat chooses a safe camp fallback and does not exit camp.
- A regression test forces several ticks and confirms no boundary leak.

## Suggested validation

- New `node scripts/test/camp-cat.cjs` with boundary and flee-down cases.
- `node scripts/test/route-finding.cjs` if movement helpers are touched.
- `npm test`.
