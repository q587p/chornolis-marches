---
id: ITEM-001
title: Pickup versus gather command semantics
status: testing
type: bug
area: inventory
priority: high
estimate: 1-2h
tags:
  - aliases
  - pickup
  - gather
  - inventory
  - ground-items
depends_on: []
---

# ITEM-001: Pickup versus gather command semantics

## Goal

Make text commands distinguish clearly between picking up a visible ground item and gathering from a location resource node.

The current shortcut routes phrases such as `підібрати ягоди`, `взяти трави`, `take herbs` and `get mushrooms` into the ordinary gather flow. That avoids a bad visible-target fallback, but it blurs two different player intents:

- `підібрати` / `взяти` / `take` / `get` means "pick up a concrete thing lying here";
- `зібрати` / `збирати` / `gather` / `шукати` means "spend time and stamina gathering from the місцина".

## First Scope

- Keep `збирати трави`, `gather herbs`, `шукати гриби` and similar gather verbs routed to resource gathering.
- Make pickup verbs first try visible ground items in the current місцина:
  - `підібрати хмиз`
  - `take torch`
  - `взяти труп`
  - tutorial-visible loose berries/herbs/mushrooms when they are actually ground items.
- If a pickup verb names a natural resource that is not a visible ground item, do not silently gather it. Reply with a useful hint, for example:
  - `Ягоди тут не лежать окремо. Їх можна зібрати.`
- Preserve corpse pickup and existing ground-resource pickup behavior.
- Add focused alias/parser coverage where possible, and add handler-level coverage if the distinction needs current-location state.

## Acceptance

- `take herbs` no longer means gather unless herbs are represented as a visible loose ground item in the current location.
- `gather herbs` still gathers from a local resource node.
- `підібрати хмиз` and `take torch` still pick up visible ground items.
- `підібрати ягоди` gives a clear hint when berries are only a gatherable local resource.
- Tutorial dream behavior remains understandable: if dream supplies are intentionally loose ground items, pickup verbs should pick them up; if they are foraging resources, gather verbs should teach gathering.
- Location detail UI should avoid rendering duplicate `всі` buttons beside multiple rows of the same loose resource type. If several stacks share one resource key, show one clear bulk-pickup affordance per resource type or group the rows before building buttons.

## Notes

This is a bridge until true item instances exist. The implementation should avoid making every resource node feel like a pile of inventory items lying on the ground.

UX polish follow-up: current compact `всі` buttons can duplicate if a location has several visible stacks of the same resource type. Keep that as pickup UI polish unless true item-instance grouping solves it first.
