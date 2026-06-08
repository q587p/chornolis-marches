# Three-Month Plan — May to August 2026

> Historical context: this 0.13/0.14/0.15 plan describes the first vertical-slice push. It is preserved for reference after those foundations landed. Use `docs/planning/next.md` for active work.

## Goal

Build the first true Chornolis moment:

> a dark living borderland where attention, light, traces, stamina, fear and observation already work together.

## 0.13 — Core Loop & Onboarding Stability

### Theme

Make the first play session stable, legible and atmospheric.

### Must Land

- ONB-002 character-name onboarding polish.
- ONB-001 dream tutorial compact completion.
- SURV-001 beginner return / `Повернення`.
- Starter camp and bridge prose polish.
- Track/detail wording polish.
- Minimal admin audit logging for dangerous tools.

### Definition of Done

A new player can create a character, pass through the dream, wake, look, examine, rest, notice something meaningful and safely return if still a beginner.

## 0.14 — Night, Light and Firewood

### Theme

Make darkness and light matter.

### Must Land

- WORLD-001 simple daypart state.
- `/time` reads world state.
- VIS-001 shared visibility helper.
- Night hides descriptions, nearby beings, tracks and ground objects without light.
- FIRE-001 active campfires and carried lit torches reveal information.
- HMYZ-001 first find/pickup/add loop.
- MAP-002 first biome-aware foraging table.

### Definition of Done

The player notices that night changes play, light reveals the world and хмиз is a practical object rather than flavor.

## 0.15 — Attention and Learning MVP

### Theme

Prove that the world teaches attentive characters.

### Must Land

- LEARN-001 minimal learning storage decision.
- OBS-001 `Спостерігати` action/alias skeleton.
- OBS-002 visible herbalist/gathering observation.
- OBS-003 first herbalism/gathering progress hint.
- TRACK-LEARN-001 first track-reading progress hint.
- TRACK-LEARN-002 one animal observation pattern.
- OMEN-001 one small living-world omen.
- Tutorial hint that careful observation matters.

### Definition of Done

The player can gain a first diegetic hint of skill progress by observing a being, action or trace in the world.

## Review Points

Review after each milestone:

- Did the patch improve the current vertical experience?
- Did it avoid broad systems too early?
- Did it preserve atmosphere?
- Did it keep Telegram UX compact?
- Did it add aliases for player-facing actions?
- If this is a release PR, are `package.json`, `package-lock.json`, changelog, news and release notes aligned?
