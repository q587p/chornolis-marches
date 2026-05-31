---
id: ADM-001-C
title: Restart confirmation and HTML safety hardening
status: next
type: technical
area: admin
priority: high
estimate: 1-2h
tags:
  - admin
  - safety
  - restart
  - slashless
  - html
  - features
depends_on:
  - ADM-001-B
---

# ADM-001-C: Restart Confirmation and HTML Safety Hardening

## Goal

Tighten two near-term safety edges that became more visible after slashless command parity and brief feature inspection work:

- `restart` without `/` should keep command parity, but destructive character reset should use the same explicit confirmation flow as `/restart`.
- Any feature field rendered into HTML should be escaped, including brief feature inspection and future feature descriptions, aliases, labels, icons and data-driven hints.

## First Scope

- Audit `/restart`, `restart` and Ukrainian restart aliases.
- Make slashless `restart` route into the confirmation flow, not an immediate destructive path.
- Keep `/restart` behavior aligned with the same flow.
- Add focused parser/handler coverage where practical so slashless parity does not bypass confirmation.
- Audit current feature rendering paths that use `parse_mode: "HTML"`.
- Ensure feature `name`, `description`, dynamic data-derived text and direct feature inspection output go through `escapeHtml` or an equivalent central helper before entering HTML strings.
- Record a short rule near feature documentation so future authored feature fields are treated as content, not trusted HTML.

## Acceptance

- `restart` and `/restart` both require confirmation before deleting character state.
- No slashless destructive command bypasses a confirmation path.
- Brief and detailed feature inspection still render correctly.
- Feature-controlled text cannot inject raw HTML into Telegram output.
- Tests cover the restart alias/confirmation expectation or the lower-level routing helper that enforces it.

## Risks

- Telegram inline confirmation state may have old buttons in existing chats; stale callbacks should fail safely.
- Escaping must not double-escape the deliberately authored HTML wrapper around already-escaped content.

## Implementation Order

Do after current 0.13.26 feature work is merged or before any broader admin/command registry cleanup.
