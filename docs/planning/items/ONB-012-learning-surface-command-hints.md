---
id: ONB-012
title: Learning surface command hints refresh
status: testing
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
  - teacher attention / learning by watching and then trying nearby;
  - groups / travelling together, where live or explicitly framed as a future lesson;
  - tinctures, herbal preparations or brewing as a future/nearby prepared-remedy idea, only with working commands once the gameplay exists.
  - existing attack-learning awareness, phrased as qualitative lived experience rather than raw combat or skill math.
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
- Attack-learning language only says that fighting or witnessing a real nearby fight can teach; it does not promise combat advantage, expose progress numbers or add a public skill sheet.
- The updated text avoids stale terms such as internal auto-mode labels when a player-facing term exists.
- If deterministic handler text is touched, add a focused test for the learning/help text surface or extend the relevant tutorial/help smoke test.

## 0.16.31 Testing Note

`0.16.31` refreshes both the tutorial dream's `Майбутні уроки` sign and the repeatable `/help` learning surface. The dream keeps the hint atmospheric: чужий слід, рука наставника, гуртова дорога, трав'яна настоянка and a real сутичка are named as future/nearby ways attention can teach. The repeatable `Навчання й увага` block covers action practice, following / `Слідування`, teacher attention, `Гурт`, live tincture commands and existing qualitative attack-learning awareness. The slice adds no new mechanics.
