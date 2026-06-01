---
id: ONB-007
title: Dream tree and vertical tutorial
status: proposed
type: feature
area: onboarding
priority: high
estimate: 3-6h
tags:
  - sleep
  - dream
  - tutorial
  - verticality
  - speech
  - onboarding
depends_on:
  - SOC-008
---

# ONB-007: Dream Tree and Vertical Tutorial

## Goal

Update the dream/tutorial flow so players learn that the world can have vertical exits (`UP` / `DOWN`) and that voice can travel between connected nearby places such as a branch and the ground below.

This answers the player expectation: “Why can’t I climb a tower/tree and call to those below?”

## Scope

- Add or adapt a tutorial dream scene around a tree, raised branch, tower-like platform or roots.
- Make the scene show a clear `UP` exit and a clear `DOWN` return.
- Add a small in-world hint that voices carry between connected nearby places.
- Use the nearby voice command from SOC-008, recommended `/yell` / `гукнути`.
- Add contextual vertical call buttons in the scene:
  - from the ground/tree base/tower base: `Гукнути вгору` / requested wording `Гукнути вверх`;
  - from the branch/tower top: `Гукнути вниз`.
- Keep the tutorial diegetic: place, voice and consequence instead of a checklist.

## Scene outline

### 1. Ground under the tree

The player sees a tree/raised frame, branches overhead, and someone/something below or nearby who could hear a call.

Example tone:

> Над вами темніє розлога гілка. Сон ніби підсовує її ближче: досить простягнути руку й піднятися.

Teach: `вгору`, `up`, `/up`. Optional contextual button once `/yell` exists: `Гукнути вгору` / `Гукнути вверх`.

### 2. Branch / raised place

After the player moves up, make verticality obvious:

> Звідси видно не більше світу, а інший кут світу: коріння, стежку під ногами, постать унизу. Голос звідси падає вниз швидше, ніж крок.

Teach: `гукнути <текст>`, `/yell <text>`. Contextual button: `Гукнути вниз`.

### 3. Call downward

When the player uses nearby voice from the branch, either by typing `/yell <text>` / `гукнути <текст>` or by using the `Гукнути вниз` shortcut:

- speaker gets confirmation;
- listener below reacts or a dream voice confirms the call reached below;
- tutorial records the command hint if the existing hint system supports it.

Example response:

> Знизу ворушиться тінь. Вона чула вас не тому, що ви кричали на весь ліс, а тому, що стояла зовсім близько — просто нижче.

### 4. Return down

Teach: `вниз`, `down`, `/down`.

Example:

> Гілка пускає вас назад. Унизу голоси знову стають ближчими, але вже не такими далекими, як здавалися.

## Implementation notes

- Existing direction aliases already support `UP` and `DOWN`; this task is mostly content/tutorial surfacing.
- The project guardrail says not to change `z` casually. This task explicitly requires verticality; keep it narrow and tutorial-specific.
- Prefer authored exits/location keys over raw coordinate assumptions.
- Vertical call buttons are UI shortcuts to `/yell`; if they cannot carry custom text directly, they should prompt or prefill the command rather than sending an empty call.
- If the current tutorial structure makes a full scene too large, land SOC-008 first and keep this item as the follow-up.

## Guardrails

- Do not make ordinary `/sleep` a teleport.
- Keep tutorial sleep/lucid dream language away from “soul” framing.
- Do not reveal hidden numbers.
- Do not make global shouting necessary to solve a local vertical problem.

## Acceptance

- A tutorial dream scene clearly teaches `UP` / `DOWN` movement.
- The player can climb from a lower tutorial location to an upper tutorial location and return.
- The lower scene can expose `Гукнути вгору` / `Гукнути вверх` when there is a visible upper listener/place.
- The upper scene teaches nearby voice with `гукнути` / `/yell` and a `Гукнути вниз` shortcut after SOC-008 is available.
- Calling from above produces a clear “heard below / nearby, not region-wide” lesson.
- Relevant checks pass: tutorial seed/content tests if world data changes, `node scripts/test/tutorial-voices.cjs` if tutorial voices are touched, `node scripts/test/input-aliases.cjs` if aliases are touched, and `npm run build`.

## Follow-ups

- Reuse the same mechanic for towers, steep banks, bridge crossings and settlement walls.
- Later let sound range interact with weather, night, hidden presence, stealth and noisy creatures.
