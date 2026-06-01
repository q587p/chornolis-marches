---
id: SLEEP-002-A
title: Ordinary sleep command gate
status: testing
type: feature
area: survival
priority: high
estimate: 1-2h
tags:
  - sleep
  - commands
  - wake
  - survival
depends_on:
  - SLEEP-002
---

# SLEEP-002-A: Ordinary Sleep Command Gate

## Goal

Make ordinary sleep feel like actual sleep: while a character is in ordinary sleep, most active commands should not run. The bot should answer with atmospheric sleep text and offer waking instead.

Tutorial dreams and future lucid dreams are separate command spaces. This item is only for ordinary sleep in the waking world.

## First Scope

- Add a central sleep-command gate before ordinary player command handlers execute.
- If the character is in ordinary sleep, allow only passive or sleep-relevant commands.
- Suggested allowlist for the first pass:
  - `/wake`, `wake`, `прокинутися`, `прокинутись`;
  - `/time` and possibly `/weather`, because they read the world rather than move the body;
  - `/help` and `/commands`;
  - `/chronicles`, `хроніки`, `події`;
  - `/news`;
  - session safety commands such as `/afk`, `/end_session` if they are otherwise available.
- Block ordinary active commands such as movement, look/examine of the waking location, gather, pickup, drop, put, attack, freshen, cook, fire/torch handling, inventory use, speech, socials, auto and queue mutations.
- For blocked commands, send short atmospheric text instead of executing the action.
- Include an inline or reply action to wake.

Suggested blocked-command copy:

```text
Сон тримає тіло важким і далеким. Це не зробити уві сні.

Хочете прокинутися?
```

## Open Questions

- Should `/me` / character card be allowed while sleeping as self-awareness, or blocked because the character is not actively inspecting themself? First implementation can block it unless UX testing shows players need a safe status view while asleep.
- Should `/inventory` be readable but inactive, or fully blocked? First implementation should block inventory actions; a read-only inventory can come later if needed.
- Should `/queue` be readable but not mutable? First implementation should avoid queue mutation while asleep.

## Acceptance

- A sleeping character cannot accidentally move, gather, fight, speak, use inventory, change auto-mode or manipulate fire without waking.
- Allowed passive commands still work while asleep.
- Blocked commands do not mutate location, inventory, queue, posture or sleep state.
- The response is atmospheric and offers `/wake` / `Прокинутися`.
- Tutorial dream commands are not broken by the ordinary sleep gate.
- Focused tests cover at least:
  - blocked movement while asleep;
  - blocked look/examine while ordinary asleep;
  - `/wake` still works;
  - `/time` or another chosen passive command still works;
  - tutorial dream routing is not blocked as ordinary sleep.

## 0.14.23 Reconciliation Notes

- Added a central ordinary-sleep command gate before ordinary handlers.
- Allowed passive/sleep-relevant commands such as `/wake`, `/time`, `/weather`, `/help`, `/commands`, `/chronicles`, `/news`, settings and session-safety commands.
- Blocked active text commands and active callback buttons with atmospheric wake-first copy and a wake button.
- Kept tutorial sleep outside the ordinary-sleep allowlist so tutorial dream flow is not treated as ordinary sleep.
