---
id: SOC-011
title: Social signal posture gates and catalog expansion
status: backlog
type: feature
area: social
priority: medium
estimate: 1-2h
tags:
  - social
  - signals
  - posture
  - aliases
  - ux
depends_on:
  - SLEEP-001
---

# SOC-011: Social Signal Posture Gates and Catalog Expansion

## Goal

Make social signals respect body state and expand the available signal catalog deliberately.

Current oddity:

```text
Ви лягаєте.
Ви вклоняєтеся.
```

`Вклонитися` should usually require standing. Other signals may still work while sitting or lying if the gesture makes sense, but the system should not let every signal ignore posture.

## First Scope

- Audit the current social signal list, aliases and buttons.
- Add a small per-signal eligibility layer:
  - standing required for full-body gestures such as bowing;
  - sitting allowed for small gestures where it fits;
  - lying/sleeping blocked for gestures that require active body control;
  - sleeping characters should not silently perform social signals.
- Return a short, useful Ukrainian prompt when posture blocks a signal:
  - ask the player to stand first for full-body gestures;
  - avoid raw debug/posture terms.
- Preserve existing signal behavior when posture is compatible.
- Add or update typed aliases and button labels together.

## Catalog Expansion

While touching the system, review whether the signal list needs a focused expansion.

Candidate directions:

- quiet acknowledgements: nod, bow, raise a hand, point;
- calming/attention signals: hush, beckon, wait, step back;
- animal/body-language-adjacent signals where safe: lower hand, keep distance, offer calm presence.

Keep this as social UX and living-world reaction surface, not a full emote economy or command spam layer.

## Acceptance

- `вклонитися` / bow-like signals require a compatible posture, normally standing.
- Lying or sleeping cannot produce physically impossible signal text.
- Compatible signals still work without new friction.
- The signal catalog and aliases are documented/tested enough that future signals do not default to “works in every posture.”
- Tests cover:
  - bow blocked while lying;
  - bow allowed while standing;
  - at least one small signal remains allowed while sitting if the catalog supports it;
  - sleeping blocks active social signals;
  - Ukrainian and slash/text aliases stay aligned.

## Out Of Scope

- No broad mentorship or relationship rewrite.
- No combat coordination system.
- No group movement changes.
- No new Prisma schema unless a later implementation proves the current action/profile data cannot express the gates.
