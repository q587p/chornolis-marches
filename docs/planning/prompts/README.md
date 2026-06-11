# Planning Prompt Archive

This directory archives planning-heavy prompts and future implementation prompts that should survive chat context loss.

Prompts here are not release notes and are not code instructions by themselves. Treat them as reusable briefs for future branches, especially when a topic crosses architecture, roadmap and operational guardrails.

## Current Files

- `12026-06-11-runtime-heartbeats-architecture.md` - prompt archive and future implementation prompts for the `0.17.x` heartbeat / scheduler runtime lane.
- `12026-06-11-attack-learning-0.16-review.md` - archive for the attack-learning / `0.16.x` boundary review and future tiny polish prompts.

## Rules

- Keep prompts honest about scope boundaries.
- Prefer behavior-preserving first slices.
- Do not hide runtime or gameplay changes inside a docs-only prompt.
- If a prompt leads to implementation, copy the relevant guardrails into the PR body.
