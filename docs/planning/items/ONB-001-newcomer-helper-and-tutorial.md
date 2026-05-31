---
id: ONB-001
title: Newcomer helper and tutorial
status: testing
type: feature
area: onboarding
priority: high
tags:
  - onboarding
  - tutorial
  - beginner
  - help
  - ux
---

# Newcomer helper and tutorial

## Goal

Add a first diegetic beginner path for new players who are interested now, before the world grows more complex.

The first version should help a new character understand what they can do without turning the opening into a mechanical checklist or a generic MMO tutorial.

## Implemented first slice

- `Дрімотна Межа` tutorial dream region on `z = -13`.
- New characters enter the dream after onboarding.
- `/sleep tutorial` returns to the saved tutorial position.
- `/sleep` without arguments routes to the tutorial while the character has not woken from it yet.
- `Прокинутися` / `/wake` leaves the dream and restores a valid real-world location.
- `Брама Сну` teaches visible locked exits and attention to written prompts: locked exits are shown from both sides of the passage, blocked movement gives a reason, and `/say Відчинитися` / `Сказати «Відчинитися»` plus natural variants such as `Відчинись будь ласка` open the route for a cycling window of about 30 seconds, 1 minute, 2 minutes, 4 minutes, 8 minutes, then back to 30 seconds.
- `0.12.2` adds two optional hub branches: `Ягідний просвіт сну` for `Роздивитися`, gathering and `Речі`, plus `Теплий присілок сну` for `Відпочити` as a brief stamina rest.
- `0.12.4` adds a south hub branch: `Плесо часу сну` for `/time`, followed by `Затишок останнього кроку` for beginner safety habits around `/look`, `/rest`, `/me` and waking from the tutorial.
- `0.12.8` adds `Лисячий просвіт сну`: a side branch that teaches the first scripted observation-learning moment through `Лисячий рух` and a one-time `Слідування трохи покращено` message.
- `0.12.8` also deepens the rest branch with `Легкий присілок сну`, a second fast-rest room, local rest speed multipliers and a first-use Сон/Дрімота comment for `/rest`.
- `0.12.10` refreshes beginner return prompts: `/start`, `/help` and unknown-input fallback messages point unfinished characters back to `/sleep tutorial` / `навчальний сон`, and `/help` offers a direct `Навчальний сон` button when relevant.

## Remaining first scope

- Keep reviewing `/start`, `/help`, fallback hints and the main keyboard as the tutorial grows, so a brand-new player sees the current game, not an older slice of it.
- Expand the dream tutorial with branches that nudge the player through:
  - simple tracks and signs;
  - more observation-learning scenes after the first fox movement proof, especially a repeatable fox/prey attack scene where `look` or `examine` at the right moment can show `Атака трохи покращена`, plus following lessons once the skill system exists;
  - speech beyond the dream-gate phrase: ordinary `say`, `shout` / `крикнути`, `whisper` / `шепнути`, and `reply` should get compact Сон/Дрімота reactions that teach the difference between local speech, loud speech, private speech and answering someone who addressed you;
  - social signals and nearby characters/creatures;
  - fire/light as a concrete tutorial branch: a guide voice can teach a torch, a quick dream relight of a згасле вогнище, and hmyz as fuel before the waking-world version becomes slower and harsher;
  - deeper danger/respawn safety once `/respawn` exists.
- Keep the helper skippable.
- Prefer short contextual prompts over a long up-front explanation.
- Keep exact numbers hidden unless the player is a scribe/admin with technical details enabled.
- When adding a new tutorial command or button, give it a short first-use diegetic comment from Сон, Дрімота, another guide voice or a local sign, and record that as a tiny event/flag when it should not repeat forever.
- Move broad beginner advice out of the hidden `/commands` catalog and into a better beginner surface when that surface is ready: compact `/help`, tutorial signs/voices or the safety branch. Candidate advice:
  - draw or keep a map;
  - read location descriptions because important clues may hide there;
  - travel with others once group play, danger and social tools support it.

## Tone options

Choose the guide form during implementation based on what feels best in the current opening:

- a borderland scribe;
- a local guide near the starter camp;
- a dream figure;
- a домовик-like presence;
- a forest-adjacent spirit;
- an animal companion.

Avoid a corporate tutorial voice. The helper should feel like someone or something from Порубіжжя.

## Acceptance notes

- A new player can reach their first meaningful action within a few taps/messages.
- The helper teaches current mechanics: location overview, closer inspection, movement, rest, inventory, time and basic danger.
- The player can skip or ignore the helper without breaking onboarding.
- `/help` and fallback unknown-input hints point toward the same beginner path.
- Future updates should keep this item in mind whenever early-game actions, resources, visibility or survival mechanics change.

## Later

- Personalized prompts based on what the character has already done.
- Referral / invited-by prompt if the referral system leaves icebox.
- Teaching and observation links once skills/progression are implemented.
