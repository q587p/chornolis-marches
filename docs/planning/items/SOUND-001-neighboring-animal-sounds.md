---
id: SOUND-001
title: Neighboring animal sounds and loud nearby events
status: next
type: feature
area: world
priority: medium
estimate: 1-2h
tags:
  - atmosphere
  - sound
  - ecology
  - daypart
  - visibility
depends_on:
  - SOC-008
---

# SOUND-001: Neighboring Animal Sounds and Loud Nearby Events

## Goal

Add a narrow atmospheric sound layer for loud animals and nearby world events so adjacent locations sometimes feel alive without turning sound into a broad simulation, tracking system or combat reveal.

The motivating feel: a player should sometimes hear a wolf from beyond the next rise, an owl at night, or frogs along wet ground in the evening, even when the creature is not standing in the exact current location.

## Scope

- Use authored visible exits and adjacent locations first. Do not reveal hidden exits, blocked paths or exact creature positions.
- Keep the first pass small:
  - wolves: rare distant howl, growl or hunting cry; may eventually reach slightly farther than ordinary nearby speech, but MVP can stay adjacent if that keeps it simple;
  - owls: dusk/night/nocturnal sound only, separate from daytime bird behavior;
  - frogs: evening/night wet-zone chorus around `riverbank` and `willow_floodplain`;
  - fox/rabbit/mouse style events only when an existing local attack/flee/action event already happens, not as constant ambient noise.
- Prefer a shared helper with speech-range adjacency where practical, but do not couple this to player chat semantics.
- Surface sound as hints, not facts: direction or terrain flavor is fine; exact species counts, HP, IDs and targetable enemies are not.

## Guardrails

- No player reward, quest, public skill numbers, combat rule changes, economy/profession system or group movement.
- No room notification spam. Add a clear per-location/species/daypart cooldown using existing marker/event infrastructure only; no Prisma schema or migration.
- Do not emit every tick. Sounds should be occasional, bounded and easy to ignore.
- Do not let ambient sound make hidden creatures or protected locations mechanically targetable.
- Do not make wet-zone frogs imply a new reproduction/spread loop; this is a visibility/atmosphere slice.

## Implementation Notes

- Start from the `SOC-008` nearby voice model: current location plus visible outgoing exits is the safest mental model.
- Candidate hook points:
  - world tick ambient check for species/daypart presence;
  - existing animal action completion for loud attack/flee outcomes;
  - location notification helpers, if they already support quiet nearby delivery.
- Keep Ukrainian text original and diegetic. Examples should be short and varied:
  - from nearby woods: a low wolf call or broken growl;
  - at night: an owl answering from the dark edge;
  - near wet ground in the evening: frogs starting a broken chorus.
- If weather later affects sound range, leave it as a follow-up rather than building it in here.

## Acceptance

- A focused test covers that adjacent visible exits can receive a nearby sound notice without revealing hidden exits.
- A focused test covers cooldown/anti-spam behavior.
- A focused test covers daypart gating:
  - owls do not use daytime behavior;
  - frogs are evening/night wet-zone atmosphere;
  - wolves remain rare and bounded.
- Player-facing text avoids exact counts and public numbers.
- Existing action-completion gameplay, `/spirit`, group movement, combat, economy/profession systems, Prisma schema/migrations and WorldEventMarker schema stay unchanged.

## Follow-ups

- Weather, stealth, hidden presence and creature alertness can tune sound range later.
- If SOC-008 grows a stable shared adjacency helper, revisit this item and reuse it deliberately.
