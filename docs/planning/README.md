# Planning

Repository docs are the source of truth for Chornolis Marches planning.

GitHub Issues and Projects may mirror these files, but should not be treated as canonical if they drift.

## Structure

- `next.md` — compact active next lane.
- `backlog.md` — accepted ideas that fit but are not current focus.
- `icebox.md` — good ideas that are too early, too large or not validated.
- `watchpoints.md` — current risks, live-watch notes and follow-up cautions that should not bloat `next.md`.
- `post_0_16_lane.md` — candidate lane after the active `0.16.x` mentorship / NPC learning work stabilizes.
- `history/` — completed release-lane notes and pre-reset planning context preserved for reference.
- `project_review_2026-05-28.md` — historical strategic audit.
- `three_month_plan_2026-05.md` — historical 0.13/0.14/0.15 plan.
- `task_slices.md` — historical ordered list of small 1-2 hour slices.
- `items/` — independent task files with front matter.
- `exports/` — generated planning mirrors from `npm run planning:export`.

## Status Values

Use this vocabulary in `docs/planning/items/*.md` front matter and planning exports:

- `proposed` — candidate idea/design, not yet accepted as backlog.
- `next` — small, actionable candidate for the active lane.
- `in_progress` — active branch or partial implementation.
- `testing` — implemented and under validation. Use this spelling; do not add new `in_testing` items.
- `backlog` — accepted, but not current focus.
- `icebox` — interesting, too early, too large or blocked by missing foundations.
- `done` — implemented and verified.
- `cancelled` — intentionally not planned.

If old notes or external exports mention `in_testing`, treat it as a legacy spelling of `testing` and normalize it when touching that item.

## Promotion Rules

Move an item from backlog to next when:

- the needed foundation exists;
- the task can be implemented and tested independently;
- it supports the current roadmap phase;
- it preserves atmosphere;
- it avoids overbuilding.

## Task Size

Most `next` tasks should fit in 1-2 hours.

If a task does not fit, split it before implementation.

`next.md` should stay compact: active lane framing plus at most 5-10 immediate candidates. Move release history into `history/`, live cautions into `watchpoints.md`, and future-lane candidates into `post_0_16_lane.md`.
