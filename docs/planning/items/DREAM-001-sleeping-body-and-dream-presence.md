---
id: DREAM-001
title: Sleeping body and dream presence separation
status: backlog
type: technical
area: dreams
priority: high
estimate: 2-4h
tags:
  - dreams
  - tutorial
  - architecture
  - body
  - liminality
depends_on:
  - SLEEP-002
  - ONB-001
---

# DREAM-001: Sleeping body and dream presence separation

## Goal

Stop treating tutorial/lucid dreams as if the body simply teleports. Keep the sleeping body in the waking location and put a separate dream presence in dream space.

## First Scope

- Design the smallest persistence shape for a sleeping body plus dream presence.
- Keep the waking body targetable/interruptible in the original location.
- Let the dream presence act in a dream location, eventually on a reserved low `z` layer such as `-13`.
- Wake the character if the sleeping body is attacked, directly shaken/poked/woken, or otherwise forcefully interrupted.
- Preserve existing tutorial completion behavior while changing the underlying model conservatively.

## Acceptance

- Documentation and code do not describe dream travel as the body teleporting.
- Documentation and player-facing text avoid “soul” / Christian framing.
- The body location and dream location can be represented separately.
- A direct attack or wake social against the sleeping body can interrupt the dream.
- Tutorial dream behavior remains playable.

## Implementation Order

Promote after ordinary sleep MVP exists and before adding broader lucid dreams.
