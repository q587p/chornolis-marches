# Codex Implementation Brief — Liminal Signs and Quotations

Suggested branch:

```text
docs/liminal-signs-quotation-layer
```

## Intent

Add a documentation/content patch that turns the owl quote, Lynchian dream/fire/fish motifs, Heraclitus/Dante/Shakespeare/map ideas and Ukrainian mythic motifs into a coherent Chornolis sign system.

The important design decision:

```text
Direct owl quote: dream/waking threshold.
Starter camp: indirect in-world echoes only.
```

## Apply order

1. Add `docs/content/signs-dreams-and-quotations.md`.
2. Update `README.md`, `docs/game_design.md` and `docs/roadmap.md` to point to the new content layer.
3. Add planning items:
   - `QUOTE-001-liminal-signs-and-quotation-layer.md`
   - `ONB-008-owl-threshold-refrain-in-dream.md`
   - `OWL-004-conditional-owl-examine-copy.md`
   - `FIRE-002-magic-campfire-examine-layer.md`
   - `FISH-003-deep-water-fishing-lines.md`
4. Do not edit generated planning exports manually unless the project has a script for regenerating them.
5. Open a PR with summary, validation and risk notes.

## Guardrails for Codex

- Do not implement broad mechanics unless explicitly asked.
- Do not repeat the direct quote in awake ordinary locations.
- Do not make every owl magical.
- Do not make every campfire uncanny.
- Do not add author names or modern media titles to player-facing UI.
- Keep Ukrainian player-facing copy intact.
- Keep docs in English where the repo already uses English, but preserve Ukrainian examples exactly.

## Validation for docs-only patch

```bash
npm test
npm run build
```

If only Markdown changes are made and the repo has no docs linter, record that no runtime validation was required.

## PR summary seed

```md
## Summary

- Added a liminal signs and quotation content bible for owls, dream thresholds, magical fires, fishing water, maps and NPC rumors.
- Recorded the placement decision that the direct owl quote belongs in the tutorial dream/waking threshold, while the starter camp should use indirect in-world echoes.
- Added Codex-ready planning items for dream threshold copy, conditional owl examine text, magical campfire examine layers and future fishing line seeds.

## Validation

- Docs-only/content-planning patch.
- Not run: runtime tests not required unless code/content seed files are changed.

## Risks

- The motif layer can become too referential if overused; guardrails now explicitly keep direct quotation rare and diegetic.
```
