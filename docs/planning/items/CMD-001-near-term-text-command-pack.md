---
id: CMD-001
title: Near-term text command pack
status: testing
type: feature
area: commands
priority: high
estimate: 2-4h
tags:
  - commands
  - aliases
  - mud
  - speech
  - navigation
depends_on: []
---

# CMD-001: Near-Term Text Command Pack

## Goal

Separate the small command set that should arrive soon from the broader future MUD/guild/builder roadmap.

These commands are valuable before a full MUD server because they make Telegram text input, a future console client and later MUD-style input feel consistent:

- `enter`
- `leave`
- `whisper`
- `reply`
- `shout`

## First Scope

0.13.4 shipped the first quick-navigation slice:

- `glance` / `глянути швидко` / `швидко глянути` — quick location read: exits and visible people/creatures, no full description.
- `exits` / `виходи` — only visible exits from the current location, including locked-visible exits.

0.13.5 shipped the first non-compass movement slice:

- `enter [place]` / `увійти [місце]` / `зайти [місце]` — enter an available inside-style exit.
- `leave [place]` / `вийти [місце]` / `назовні` — leave the current inside-style area when an outside exit exists.

0.13.6 shipped the speech slice:

Speech:

- `whisper [player] [message]` / `шепнути [персонаж] [текст]` — private local speech to one visible target; others nearby should only see that someone whispers without details.
- `reply <message>` / `відповісти <текст>` — reply to the last character who addressed you; should work even if darkness/hidden state means you cannot currently identify them clearly.
- `shout <message>` / `крикнути <текст>` / `гукнути <текст>` — wider-range speech, likely region-wide first; should cost significant stamina and have clear anti-spam limits.

The first implementation keeps this conservative:

- `whisper` targets visible player characters in the current location and hides the spoken text from bystanders.
- `reply` uses recent local `SAY` events that addressed the character's name/forms.
- `shout` reaches the current region and spends extra stamina through the shared speech/action queue path.

## Acceptance

- Commands parse through the shared alias layer where practical.
- Slash or direct text forms exist for each command.
- Ukrainian aliases and English/MUD-style aliases are documented together.
- `/commands` lists these as current commands once implemented.
- `/help` stays compact and points to `/commands` rather than becoming a wall of text.
- Focused parser tests cover the new aliases.
- Speech privacy rules are explicit enough that hidden/darkness cases do not leak details.

## Notes

Keep this separate from larger future systems:

- `party` / `guild`
- `spells` / `cast`
- `journal`
- builder commands
- moderation commands

Those remain later command-registry work. This item is the small, high-priority player-facing command pack.
