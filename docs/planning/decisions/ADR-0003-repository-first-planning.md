# ADR-0003: Repository-first planning

## Status

Accepted

## Context

GitHub Issues and Projects are useful, but they are platform-specific. If the project moves elsewhere, issue metadata and project boards may be harder to preserve.

## Decision

Keep important planning records in the repository as Markdown files. GitHub Issues/Projects can mirror or operationalize those records, but should not be the only source of truth.

## Consequences

- Planning has git history and code review.
- Ideas can be moved between GitHub, GitLab, Notion, Obsidian, Linear or another tool.
- Export/import scripts can generate machine-readable representations.
- The repo becomes more self-documenting.
