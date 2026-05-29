# Planning

Repository docs are the source of truth for Chornolis Marches planning.

GitHub Issues and Projects may mirror these files, but should not be treated as canonical if they drift.

## Structure

- `next.md` — active next lane.
- `backlog.md` — accepted ideas that fit but are not current focus.
- `icebox.md` — good ideas that are too early, too large or not validated.
- `project_review_2026-05-28.md` — strategic audit.
- `three_month_plan_2026-05.md` — current 0.13/0.14/0.15 plan.
- `task_slices.md` — ordered list of small 1–2 hour tasks.
- `items/` — independent task files with front matter.

## Status Values

- `next` — should be considered for the active patch line.
- `backlog` — accepted, but not current focus.
- `icebox` — interesting, too early or too large.
- `done` — implemented and verified.
- `cancelled` — intentionally not planned.

## Promotion Rules

Move an item from backlog to next when:

- the needed foundation exists;
- the task can be implemented and tested independently;
- it supports the current roadmap phase;
- it preserves atmosphere;
- it avoids overbuilding.

## Task Size

Most `next` tasks should fit in 1–2 hours.

If a task does not fit, split it before implementation.
