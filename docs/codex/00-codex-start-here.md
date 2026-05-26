# 00 — Codex Start Here

Use this file first when working on **Chornolis Marches / Порубіжжя Чорнолісу**.

## One-paragraph project memory

Chornolis Marches is a Ukrainian dark-fantasy Telegram RPG / living-world sandbox about a liminal forest frontier: the border between settlement, wilderness, myth, human life, spirits, danger, and the unknown. The project should feel diegetic, atmospheric, folklore-inflected, and alive. The player should not feel like they are operating a generic MMO menu; they are moving through a place that notices them, changes over time, and can teach them through use, observation, and consequences.

## Most important permanent rules

1. Do not put the internal versioning/package-file workflow note into news/changelog.
2. Preserve current functionality unless the user explicitly asks to replace it.
3. Prefer Ukrainian UI and project-specific terminology.
4. Use `docs/codex/` files for context before editing unfamiliar systems.
5. For map edits, start with `prisma/data/chornolis_world_seed.json` and read `docs/codex/07-world-and-map-notes.md`.
6. For release/update tasks, read `docs/codex/05-workflow-and-versioning.md`.

## Preferred workflow for code tasks

- Inspect current repo state before editing.
- Identify exact files to change.
- Make the smallest coherent change that preserves behavior.
- Run the relevant build/check/test command if available.
- Summarize changed files and any checks run.
- Only mention version bump when explicitly relevant; the user usually handles it manually after a green build.

## Context routing

- Project overview and memories: `01-project-memory.md`
- Core design: `02-design-pillars.md`
- Roadmap/icebox: `03-roadmap-and-icebox.md`
- Ukrainian language/style: `04-terminology-and-language.md`
- Canonical UI/gameplay terminology: `../design/terminology.md`
- Version/build/release rules: `05-workflow-and-versioning.md`
- Tech stack and architecture: `06-technical-context.md`
- Map/world seed: `07-world-and-map-notes.md`
- Prior updates/fixes: `08-prior-version-notes.md`
- Open questions: `09-open-questions.md`
