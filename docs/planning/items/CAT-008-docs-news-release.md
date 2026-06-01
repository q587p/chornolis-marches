---
id: CAT-008
title: Camp spirit cat docs, news and release notes
status: next
type: content
area: docs
priority: low
tags:
  - cat
  - docs
  - news
  - release
  - planning
---

# CAT-008 — Docs, news and release notes

## Summary

Document the camp spirit cat system and ship player-facing release/news copy after implementation.

## Scope

- Add or update `docs/systems/camp_spirit_cat.md`.
- Update `docs/systems/ecology.md` if the cat participates in camp mouse pressure.
- Update social/input alias docs if new commands are added.
- Update `docs/planning/next.md` and planning exports.
- Add release notes and public news copy.
- Mention guardrails: no taming/following/death/out-of-camp hunting in MVP.

## Out of scope

- Marketing copy outside repository docs.
- Full lore article unless implementation grows beyond MVP.

## Acceptance criteria

- Docs explain what the cat does and does not do.
- Player-facing news is Ukrainian, atmospheric and concise.
- Release notes list validation commands.
- Planning exports are regenerated if required.

## Suggested validation

- `npm run planning:export`.
- `npm test`.
- `npm run build`.
- `git diff --check`.
