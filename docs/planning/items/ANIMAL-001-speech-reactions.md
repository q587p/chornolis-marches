---
id: ANIMAL-001
title: Animal speech reactions
status: backlog
type: feature
area: ecology
priority: medium
estimate: 2-4h
tags:
  - animals
  - speech
  - social
  - ecology
  - reactions
depends_on:
  - SOC-008
---

# ANIMAL-001: Animal Speech Reactions

## Goal

Let animals react to directed player speech without treating them like human NPC conversation partners.

Animal target UI should avoid human-style `Привітати`; interaction with animals should lean on body language, signals, proximity and risk. If a player still speaks directly to an animal through `say` / targeted speech, the world should answer with species-shaped behavior instead of a generic social greeting.

## Motivation

Players can and will try to talk to animals. That should feel like Chornolis noticing the attempt:

- saying something to a mouse may startle it and make it flee to a neighboring location;
- saying something to a fox may make it pause, stare back or slip away;
- saying something to a wolf may earn a growl, and repeated provocation can become dangerous.

## Scope

- Keep `Привітати` hidden for animal target buttons.
- Allow directed speech to animals through existing speech paths where the target is visible and addressable.
- Add a small reaction layer after animal-directed speech:
  - mouse: high chance to flee through a valid nearby exit;
  - rabbit: high chance to flee or freeze briefly;
  - fox: lower chance to flee, chance to look back / show wary curiosity;
  - wolf: chance to growl or warn; repeated nearby directed speech can queue an attack if the wolf stays present.
- Record reactions in ordinary local messaging and/or `WorldEvent` without spamming broad proactive channels.
- Respect action queue, presence/session send guards and existing animal movement boundaries.

## Acceptance

- Animal target keyboards do not show `Привітати`.
- Directed speech to a mouse can trigger a flee action.
- Directed speech to a fox can produce a short wary reaction without making it a conversational NPC.
- Directed speech to a wolf can escalate after repeated provocation.
- Reactions use species key / diet / current danger context rather than a single generic animal response.
- Tests cover at least mouse flee, fox non-human reaction and wolf escalation guard.

## Out of Scope

- Full animal taming.
- Animal language.
- Generic reputation with animals.
- Pet / companion mechanics.
- Complex hidden mood state beyond a tiny repeated-provocation counter if needed.
