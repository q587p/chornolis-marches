---
id: CMD-002
title: Put items into local containers and features
status: testing
type: feature
area: commands
priority: high
estimate: 2-4h
tags:
  - commands
  - inventory
  - containers
  - aliases
depends_on:
  - LOOP-002
---

# CMD-002: Put Items Into Local Containers and Features

## Goal

Implement a narrow `put` action that lets a player place item stacks into a local feature/container, starting with carcasses/remains into the gate drop-off.

Target command forms:

```text
put [something] [number|all] [container]
/put [something] [number|all] [container]
покласти [щось] [число|все] [кудись]
```

## MVP Scope

- Source: player inventory.
- Target: local feature/container in the current location.
- Amount: default `1`, explicit integer, or `all` / `все`.
- Container matching: local feature name, aliases or key.
- Valid carcasses/remains into the gate drop-off call the contribution service.
- Invalid target or invalid item must not consume the item.

## Out of Scope

- Nested bags.
- Locked chests.
- Putting items into other characters.
- Full item splitting UI beyond numeric/all text forms.
- Dragging heavy carcasses over long distances.

## Acceptance

- `/put туша рів` defaults to one matching carried carcass/remains item.
- `/put туша all рів` and `покласти всі рештки до ями` can move the whole matching carried amount.
- Numeric amount rejects impossible amounts.
- Invalid items and invalid containers are reported clearly.
- Parser tests cover default, numeric and all/все forms.
