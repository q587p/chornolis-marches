---
id: ONB-012
title: Learning surface command hints refresh
status: next
type: feature
area: onboarding
priority: high
estimate: 1-2h
tags:
  - onboarding
  - tutorial
  - commands
  - help
  - learning
  - ux
depends_on: []
---

# ONB-012 — Learning Surface Command Hints Refresh

## Goal

Refresh the repeatable “Навчання” / tutorial-facing learning surface so newer player-facing systems are discoverable as hints without turning the first dream into a full manual.

The near-term need is to make the learning surface aware of newer or emerging commands and flows such as following a visible trail/person, road groups, and prepared remedies/tinctures. If a system is not fully live yet, the tutorial should phrase it as a possibility or future lesson rather than presenting a clickable command that does not work.

## Scope

- Add or update short Ukrainian hints in the tutorial/learning surface for:
  - following or keeping a trail/person in sight;
  - groups / travelling together, where live or explicitly framed as a future lesson;
  - tinctures, herbal preparations or brewing as a future/nearby prepared-remedy idea, only with working commands once the gameplay exists.
- Keep `/help`, `/commands`, buttons and typed aliases aligned with the same canonical action names where a command is live.
- Prefer diegetic guide text, sign text or compact lesson copy over a broad tutorial rewrite.
- Keep old command names out of new visible tutorial copy unless they remain intentional aliases.

## Guardrails

- No new group movement implementation in this slice.
- No new brewing/crafting gameplay in this slice.
- No public skill sheet or raw learning numbers.
- No `/spirit` unlock or mentorship effect changes.
- Do not overload the first tutorial dream; use repeatable learning/help surfaces when the hint is not first-session critical.

## Acceptance

- “Навчання” includes at least text-level discovery for follow/teacher attention and group/travel-together concepts.
- Tincture/prepared-remedy language is either backed by live commands or clearly framed as a later lesson.
- The updated text avoids stale terms such as internal auto-mode labels when a player-facing term exists.
- If deterministic handler text is touched, add a focused test for the learning/help text surface or extend the relevant tutorial/help smoke test.
