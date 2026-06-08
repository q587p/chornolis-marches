---
id: RES-001
title: Wetland medicinal reagents
status: backlog
type: feature
area: resources
priority: medium
estimate: 2-4h
tags:
  - resources
  - riverbank
  - swamp
  - willow
  - alchemy
  - herbalism
depends_on:
  - MAP-005
  - ALC-001
---

# RES-001: Wetland Medicinal Reagents

## Goal

Add one or two region-specific medicinal resources for riverbank / willow floodplain / swamp-like areas so those places feel different from ordinary forest and dry meadow foraging.

The first reagent should support later healing or night-sight tinctures without opening a broad alchemy economy.

## Recommended First Resource

Technical key:

```text
willow_bark
```

Ukrainian name:

```text
вербова кора
```

Use:

- soothing/healing tinctures;
- herbalist route behavior;
- willow floodplain active curiosities.

Suggested description:

```text
Гіркувата кора з молодої верби. Її не гризуть заради смаку; знахарі бережуть таку річ для болю, жару й довгих доріг.
```

## Optional Second Resource

Technical key:

```text
calamus_root
```

Ukrainian name:

```text
корінь аїру
```

Use:

- clarity / night-sight / nausea-handling draughts;
- wetland identity;
- future mushroom-risk mitigation.

## First Scope

- Add `willow_bark` as a resource type with Ukrainian forms.
- Do not add it to every `RIVER` or `SWAMP` biome by default.
- Prefer one or two authored features / active curiosities:
  - willow knot;
  - damp bark scrape;
  - reed-root edge;
  - quiet pool side.
- `/examine` should reveal whether the feature can be harvested safely.
- A small action can gather exactly one or a small bounded amount.
- Add tests for resource type, feature data and no raw HTML/key leakage.

## Guardrails

- Do not create broad resource inflation.
- Do not make every wet tile a reagent farm.
- Do not add shops/barter/prices.
- Do not make healing tinctures possible until their own task lands.
- Do not make reagent gathering invisible to ecology/resource pressure if it becomes repeatable.
- Keep region identity strong: wetland reagents should feel tied to water, willow and mud.

## Acceptance

- At least one wetland/riverbank authored feature can provide `willow_bark`.
- The feature has meaningful look/examine split and aliases.
- The resource has lexicon/admin surfaces where required.
- Gathering it is bounded and tested.
- Docs record future use in healing/night-sight tinctures.
