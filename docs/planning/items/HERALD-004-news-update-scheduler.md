---
id: HERALD-004
title: Herald news update scheduler and admin notice
status: backlog
type: feature
area: herald
priority: medium
estimate: 2-4h
tags:
  - herald
  - news
  - scheduler
  - telegram
  - admin
depends_on:
  - HERALD-002
---

# HERALD-004: Herald News Update Scheduler And Admin Notice

## Goal

Let the Boundary Mark Chancery Herald periodically check deployed `news.md` for
entries that do not yet have an active queued or published
`HeraldPublication`, then notify admins with compact previews and suggested
actions.

This extends the manual `/news_updates` / `/check_news_updates` operator check.
It should not publish anything automatically.

## Scope

- Add a configurable Herald-side scheduler for checking deployed `news.md`.
- Reuse the existing shared `news.md` parser, archive ordering and
  `HeraldPublication` content-hash dedupe path.
- Add env/config such as:
  - `HERALD_NEWS_UPDATE_CHECK_ENABLED`;
  - `HERALD_NEWS_UPDATE_CHECK_INTERVAL_MS`;
  - `HERALD_NEWS_UPDATE_NOTICE_CHAT_ID`;
  - optional notice thread id if Herald thread support is active.
- Send a compact admin-only notice when one or more missing news entries are
  found:
  - count of missing entries;
  - short preview titles/versions;
  - suggested commands such as `/news_archive_preview N`,
    `/news_archive_post N`, `/backfill_news_queue 23m` or
    `/news_updates`.
- Avoid repeating the same notice too often when nothing changes.
- Keep startup behavior safe: a deploy/restart may run a check, but it must not
  publish automatically or drain a backlog.
- Keep the current manual commands available as the explicit recovery path.

## Guardrails

- Do not publish news, queue archive backfill or resume the publisher loop
  automatically.
- Do not expose secrets, Telegram tokens, channel ids, admin id lists or
  `DATABASE_URL`.
- Do not notify public channels by default; prefer an admin/private chat.
- Do not send repeated notices every tick for the same unchanged set of missing
  entries.
- Do not import the main game bot runtime or start world tick/action queue from
  Herald-only code.
- Keep this separate from startup notices: startup can say the Chancery is
  alive, while this scheduler says `news.md` has entries needing admin review.

## Acceptance

- With the scheduler disabled, Herald behavior matches the current manual-only
  check.
- With the scheduler enabled and missing news present, admins receive a visible
  notice with previews and safe suggested commands.
- With no missing news, the scheduler stays quiet or sends only a deliberately
  configured diagnostic response.
- Restarting the Herald does not duplicate channel publications.
- Repeated checks for the same missing entries are rate-limited or deduped.
- Tests cover missing-news detection, disabled config, enabled notice, dedupe
  and safe command suggestions.
- Ops docs explain the env variables and the relationship to `/news_updates`.

## Notes

This should land after the manual `0.15.33` news-update check has proven useful
in production. The important distinction is that the scheduler may remind an
admin, but the admin still chooses whether to preview, queue or post.
