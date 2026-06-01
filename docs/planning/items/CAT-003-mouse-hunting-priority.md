---
id: CAT-003
title: Spirit cat mouse hunting priority inside camp
status: next
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
