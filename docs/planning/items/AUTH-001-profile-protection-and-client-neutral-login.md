---
id: AUTH-001
title: Profile protection and client-neutral login
status: icebox
type: system
area: account
priority: medium
estimate: unknown
tags:
  - auth
  - account
  - profile
  - mud
  - recovery
depends_on:
  - WEB-001
---

# AUTH-001: Profile protection and client-neutral login

## Goal

Let a player protect and recover their profile independently from a single Telegram identity.

Telegram should remain the MVP client, but the long-term game identity should not be only `telegramId`. Future web, console or MUD-style clients need a way to authenticate the same character without relying on Telegram.

## Why It Matters

- A player may lose Telegram access and need to recover their existing character from another device or account.
- Future MUD/Telnet or console clients will not naturally provide a Telegram id.
- Moderation, bans, account linking and profile recovery need a durable account layer separate from one messenger adapter.

## Future Shape

- Add an account identity layer above individual client identities.
- Support email/password or another recovery credential after the security model is designed.
- Link Telegram identities to the account rather than treating Telegram as the account itself.
- Let a protected account authenticate through future MUD/web/console clients.
- Support careful recovery flows for lost Telegram access.
- Keep scribe/admin recovery tools auditable and resistant to social-engineering mistakes.

## Open Questions

- Should profile protection be optional at first, or required before non-Telegram clients can log in?
- How should password reset work without exposing private data to scribes/admins?
- What recovery evidence is acceptable if a player loses both Telegram and email?
- Should MUD access require linking from Telegram first, or allow account-first creation later?
- How should bans/mutes apply across linked Telegram, web and MUD identities?

## Out Of Scope For Now

- Implementing email delivery.
- Implementing password storage.
- Implementing MUD login.
- Migrating current Telegram-only accounts.
- Admin-side identity recovery UI.
