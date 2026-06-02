---
id: CAT-003
title: Spirit cat mouse hunting priority inside camp
status: in_progress
type: feature
area: ecology
priority: medium
tags:
  - cat
  - mouse
  - predator
  - camp
  - ecology
---

# CAT-003 — Mouse hunting priority

## Summary

Make camp mice the cat’s first normal behavior priority, above meat interest and idle/social actions.

## Scope

- Detect visible/live mice in the same camp location or nearby allowed camp node.
- Queue or resolve a cat hunting action through existing creature attack/predator helpers where practical.
- Keep the cat from pursuing prey outside camp.
- Use cat-specific starter action text for stalk/pounce/fail/success.
- Let a successful hunt leave sensible output and/or a small corpse cleanup path.

## 0.15.11 Partial Slice

0.15.11 adds the first pre-hunt priority behavior:

- if live visible mice are in the cat's current camp/watchtower location, the cat chooses its local mouse-listening watch posture before ordinary up/down movement;
- this keeps the cat from randomly leaving the exact node where mice are present during that tick;
- it does not yet attack, kill, clean up corpses or touch predator kill counters.

The broader CAT-003 hunting acceptance remains open for the next behavior slice.

## 0.15.12 Partial Slice

0.15.12 adds the first actual camp-local pounce:

- if a live visible mouse is in the cat's current camp/watchtower location, the cat may queue an existing `ATTACK` action before ordinary movement or idle watching;
- the action uses cat-specific miss, wound and kill copy instead of generic predator text;
- the cat still does not chase mice outside the starter camp/watchtower pair, does not hunt non-mouse prey and does not become an ordinary predator;
- because the cat remains `SPIRIT`/`SPIRITUAL`, it stays out of ordinary animal lifecycle and predator species statistics.

The broader CAT-003 hunting acceptance remains open for tuning, corpse cleanup/feeding details and future give/meat interaction.

## Out of scope

- Full predator ecology changes outside camp.
- Cat reproduction or hunger need.
- Hunting rabbits/owls/large animals.
- Scent/sound tracking outside current camp visibility.

## Acceptance criteria

- If a mouse is in camp, the cat chooses mouse behavior before meat theft/idle.
- If the mouse leaves camp, the cat stops at the camp boundary.
- The cat does not hunt non-mouse prey in MVP.
- Hunting produces Ukrainian atmospheric copy, not debug text.
- A test proves mouse priority over meat interest.

## Suggested validation

- `node scripts/test/camp-cat.cjs` for priority.
- `node scripts/test/ecology-stats.cjs` if kill counters are touched.
- `node scripts/test/attack-rules.cjs` if ordinary attack helpers are reused.
- `npm test`.
