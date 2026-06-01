# GitHub Workflow

Repository docs are the planning source of truth. GitHub Issues, Projects and PRs mirror or review that work rather than replacing the canonical planning files under `docs/planning/`.

## Release Branch And PR Flow

- Start patch/minor work on a separate branch, preferably with the `codex/` prefix.
- Open a PR from that branch into `main` for review and merge.
- Keep the PR description short but complete: summary, validation/checks, risks and rollback notes.
- For documentation-only or planning-only PRs, say so directly in the risks section.
- Keep `CHANGELOG.md`, release notes and `news.md` aligned when the change is player-facing. Do not add public news for purely internal workflow-only updates unless they affect players/admins.

## Recommended Structure

- `README.md` — project overview, setup, current status.
- `ROADMAP.md` — long-term phases and planned systems.
- `GAME_DESIGN.md` — design pillars and philosophy.
- `docs/systems/` — detailed mechanics.
- GitHub Issues — concrete tasks.
- GitHub Projects — kanban planning.

## Recommended Project Board Columns

- Backlog
- Next
- In Progress
- Testing
- Done
- Icebox

## Recommended Labels

- gameplay
- survival
- combat
- crafting
- ecology
- exploration
- npc
- lore
- telegram-ux
- atmosphere
- refactor
- bug
- enhancement

## Suggested Milestones

- 0.13 — Core Loop & Onboarding Stability
- 0.14 — Night, Light and Firewood
- 0.15 — Attention and Learning MVP
