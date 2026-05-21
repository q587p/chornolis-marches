# Planning

This directory keeps project planning in the repository.

GitHub Issues and Projects are useful working interfaces, but they should not be the only source of truth. Important ideas, backlog items, Icebox concepts and design decisions should live here as text files so they have:

- git history;
- code review through pull requests;
- easy migration away from GitHub if needed;
- readable context for future contributors and tools;
- export/import options.

## Structure

```txt
docs/planning/
  README.md
  backlog.md
  next.md
  icebox.md
  items/
  decisions/
  exports/
```

## Statuses

- `idea` — raw idea, not shaped yet.
- `icebox` — good idea, but too early or not aligned with the next versions.
- `backlog` — accepted work, not scheduled yet.
- `next` — candidate for the next patch/minor version.
- `in_progress` — actively being implemented.
- `testing` — implemented, needs validation or balancing.
- `done` — completed.
- `cancelled` — deliberately not planned.

## Source of truth

Planning Markdown files are the source of truth.

GitHub Issues/Projects may mirror them for convenience, but if there is a conflict, update the repository files first.

## Export

`docs/planning/exports/` contains static JSON/CSV examples generated from the Markdown planning items.

A generator script can be added later if the planning format stabilizes and automatic sync becomes useful.
