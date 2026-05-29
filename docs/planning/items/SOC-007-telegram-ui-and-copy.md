---
id: SOC-007
title: Telegram UI and copy for contacts / follow / groups
status: backlog
type: feature
area: social
priority: medium
tags:
  - social
  - telegram
  - ui
  - copy
  - groups
depends_on:
  - SOC-001
  - SOC-002
  - SOC-003
---

# SOC-007 — Telegram UI and Copy for Contacts / Follow / Groups

## Goal

Make the social layer usable in Telegram without message spam or generic MMO wording.

Canonical design note: `docs/systems/social_graph_and_groups.md`.

## Scope

- Add target buttons where appropriate:
  - `Запам’ятати`
  - `Слідувати`
  - `Взяти до гурту`
  - `Вийти з гурту`
  - `Виключити з гурту`
- Add `Гурт` command/button status entry.
- Add `Знайомства` command/button entry if there is room.
- Keep buttons contextual. Do not show every social option everywhere.
- Reuse target list and existing visibility rules.

## Copy Rules

- Use `Гурт` in UI.
- Use `Снага`, not stamina.
- Use `Життя` / `Стан` depending on existing code context.
- Do not say "NPC" in normal player-facing text.
- Use `Хтось`, `постать`, `місцевий`, `істота` when identity is unclear.
- Debug mode may show actor keys.

## Message Spam Guardrails

- Group movement should produce one compact leader message, one member message per actual member, and one observer message per location where useful.
- Avoid sending a full location description to every member after every group move unless it is already normal movement behavior and acceptable.
- Prefer concise summaries with optional `Озирнутися` / `Роздивитися` buttons.

## Acceptance Criteria

- Contextual buttons appear only when action is possible.
- Group status is readable in one message.
- Copy uses Chornolis terminology.
- No normal message reveals player-vs-NPC technical type.
- Build and tests pass.
