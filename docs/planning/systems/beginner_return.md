# Beginner Return / Повернення

## Goal

Give new or weak characters a diegetic safety valve when they get lost, stuck, knocked out or pushed too far before they are established.

This is not fast travel. It is early-game mercy that protects testing and onboarding while keeping the world dangerous.

## Player-Facing Name

Canonical player-facing name: `Повернення`.

Slash command compatibility: `/respawn`.

Possible text aliases:

- `повернення`
- `повернутися`
- `вернутися до табору`
- `respawn`

## First Scope

- Return eligible early characters to `start_border_camp`.
- Gate behind a beginner/progression threshold.
- Confirm before moving the character.
- Cancel or safely interrupt incompatible queued actions.
- Add a cooldown or small consequence.
- Write a `WorldEvent` or equivalent audit trail.

## Eligibility Ideas

A character may be eligible if:

- onboarding is complete or the tutorial was intentionally skipped;
- the character is still below an early progression threshold;
- the character is not using the command to escape an established consequence;
- the command has not been used too recently.

The first version can be conservative. It is better to refuse with atmospheric text than to create reusable fast travel.

## Possible Consequences

Use only one or two in the first slice:

- lower stamina after returning;
- cooldown before next use;
- local event memory;
- message that the return was not painless.

## Refusal Tone

```text
Стежка назад більше не слухається так легко. Ви вже занадто добре тримаєтеся цього світу, щоб сон просто виніс вас до табору.
```
