---
id: HAWK-001
title: Daytime hawk mouse-pressure slice
status: next
type: feature
area: ecology
priority: high
estimate: 2-4h
tags:
  - hawk
  - ecology
  - predator
  - daypart
  - mice
depends_on:
  - OWL-001
---

# HAWK-001: Daytime Hawk Mouse-Pressure Slice

## Goal

Add `hawk` as a small daytime predator that mirrors the early owl ecology without turning birds into a full flight/nest system.

Use **hawk -> яструб** as the ordinary species. Keep **сокіл** for a later, more symbolic or legendary bird layer, not this practical ecology slice.

## Why

Owls help with mouse pressure at night, dawn and dusk. A hawk can make open daytime locations feel watched without adding burrows, poison, stealth or a new combat system.

This creates a simple ecology pair:

- owl: night/dawn/dusk mouse pressure;
- hawk: dawn/day/dusk mouse pressure;
- fox/wolf/cat: keep their existing local roles.

## Scope

- Add `hawk` as `ANIMAL` / `CARNIVORE`.
- Add a small starter hawk count in open or edge locations:
  - dry luka;
  - riverbank;
  - open meadow / open cells;
  - not inside the starter camp/watchtower pair.
- Daypart behavior:
  - active at dawn, day and dusk;
  - sleeping/hidden or inactive at night.
- Predator preference:
  - strongly prefer mice;
  - rarely target child/young rabbits;
  - avoid broad rabbit pressure unless live data requires it.
- Make hawks stronger on open locations than deep forest, at least through placement first. If that is not enough, add a small biome/open-cell helper later.
- Add hawk-specific action/observer text so daytime attacks do not read like generic predator events.
- Keep predator-by-species stats useful for comparing owl/fox/wolf/hawk pressure.

## Guardrails

- Do not implement flight, nests, eggs, breeding, feathers-as-items or ranged hunting in this slice.
- Do not add a Prisma migration unless a later design proves it is unavoidable.
- Do not make hawks a player combat threat in this slice.
- Do not use `сокіл` as the common species name here; reserve it for a future symbolic/legendary bird.
- Do not put hawks into breeding-pair restoration.
- Keep starter placement away from beginner-critical supply spots.

## Acceptance

- `hawk` exists as a seeded species and starter animal option.
- Starter hawks appear in a small number of open/edge locations.
- Hawks are active in dawn/day/dusk and inactive at night.
- Hawks strongly prefer mice and only rarely threaten young rabbits.
- Hawk attacks have species-specific text.
- Focused tests cover starter data, daypart behavior and predator preference.
- `npm test` and `npm run build` pass.

