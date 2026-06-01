---
id: REL-001
title: Release branch PR summary and risk discipline
status: testing
type: process
area: release
priority: high
estimate: 1h
tags:
  - release
  - github
  - pr
  - planning
depends_on:
  - PLAN-001
---

# REL-001: Release branch PR summary and risk discipline

## Goal

Make the release/review path explicit: patch and minor work should happen on a separate branch, go through a PR into `main`, and carry a useful summary plus risk notes.

## First Scope

- Record the branch/PR rule in Codex workflow memory.
- Update GitHub workflow docs so PRs include summary, validation and risks.
- Start `0.13.19` from a dedicated branch rather than directly on `main`.
- Keep planning exports aligned after adding this planning item.

## Acceptance

- `docs/codex/05-workflow-and-versioning.md` mentions branch, PR, summary and risk expectations.
- `docs/ux/github_workflow.md` mentions branch-to-main PR flow and current planning milestones.
- `docs/planning/next.md` and `docs/planning/task_slices.md` show `REL-001` as the active 0.13.19 process slice.
- The PR for this work includes a summary, checks and risks section.

## Risks

- This is a process/documentation change only; it should not change runtime behavior.
- The main practical risk is drift: future feature PRs may still forget `news.md`, release-note title scope or risk notes unless the checklist is used consistently.

## Progress

- 0.13.19 starts from `codex/0.13.19-summary-risks` and records this branch/PR discipline in repository memory.
