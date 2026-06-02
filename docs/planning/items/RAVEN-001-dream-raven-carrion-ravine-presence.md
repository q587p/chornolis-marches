---
id: RAVEN-001
title: Dream raven presence near the carrion ravine
status: backlog
type: feature
area: world
priority: high
tags:
  - raven
  - dream
  - carrion-ravine
  - onboarding
  - world-time
  - atmosphere
---

# RAVEN-001: Dream raven presence near the carrion ravine

## Goal

Let the raven from the tutorial dream occasionally cross into the waking borderland near the carrion ravine, especially at night or other threshold dayparts. The scene should make the dream feel connected to the living world without turning the raven into a full NPC system, companion, combat target, or ordinary animal loop.

## Player Fantasy

A character who reaches the carrion ravine at the right time may notice a raven feeding, watching, or moving among the remains. Once per character, the raven recognizes them and greets them in a way that refers to when they first came to Chornolis using local project/world date phrasing, not a raw real-world timestamp.

Draft tone direction:

> Крук підіймає дзьоб від темного падла й дивиться так, ніби бачив вас ще до першого кроку.
>
> «Пам'ятаю тебе. Ти прийшов у Порубіжжя тоді, коли [local date phrase] торкнувся межі. Сон ще тримався за твої плечі».

The final text should be rewritten in the project's usual atmospheric Ukrainian style once the actual date helper and raven presence rules are chosen.

## First Scope

- Add a rare or conditional raven presence near the carrion ravine, with strongest availability at night, dusk, or dawn.
- Keep the first greeting one-time per character; do not repeat it on every visit.
- Derive the greeting's arrival reference from character arrival data, such as `Player.createdAt` or a future arrival chronicle, converted into local Chornolis/world date wording.
- Add varied local activity lines for `/examine` or close inspection when the raven is present. Aim for roughly ten variants: feeding, listening, hopping along bones, preening, watching from an edge, pulling at carrion, hiding in shadow, refusing to be fully seen, and similar ravine-specific behavior.
- Keep random raven lines local and quiet. They should not become proactive spam.

## Out Of Scope

- Full dialogue tree.
- Combat, hunting, taming, feeding, loot, or ordinary animal lifecycle.
- Guaranteed appearance every time the player visits the ravine.
- Region-wide or world-wide announcements.
- A separate dream-return system.

## Acceptance

- The raven can be encountered near the carrion ravine only under the intended time/visibility conditions.
- The recognition greeting happens no more than once per character.
- The greeting uses local Chornolis/world date phrasing for the character's arrival.
- Full inspection can show varied raven activity when the raven is present.
- The implementation does not add noisy proactive messages or turn the raven into a generic animal.
