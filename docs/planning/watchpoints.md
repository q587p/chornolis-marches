# Planning Watchpoints

Current cautions and live-watch notes that should inform near-term work without bloating `next.md`.

## Active 0.16 Watchpoints

- Keep the `0.16.x` mentorship / NPC learning lane narrow. It should prove guided attention and practice, not become a broad profession economy.
- The active mentor offer text still has known gender/form-awareness follow-up risk. Fix copy before widening gathering mentors beyond the current authored cases.
- Watch the `amount=2` gathering observation bonus in live play. If following one herbalist grows gathering too quickly, add a cooldown or separate `mentorship_observation` context.
- Tracking mentorship lesson feedback should stay tied to route-memory learning until a separate explicit hunter-teaches event is worth the extra machinery.
- The first guided practice prompt appears only when a new lesson feedback marker is created. If live play makes it feel too rare, split lesson feedback cooldown from practice-prompt cooldown instead of making every observation generate copy.
- Lesson/practice cooldowns now use structured `WorldEventMarker` rows. If slow logs heat up again, tune indexed marker fields or retention rather than returning to `WorldEvent.description` parsing.
- Route-memory remains `WorldEvent`-backed for now. Repeated route-memory hotspots should become a structured route-memory/marker follow-up rather than broader event scans.

## Learning And Text Watchpoints

- Ordinary `/me` and target inspection should stay short and qualitative; technical/scribe surfaces keep raw rows.
- Action effects should use previous stored experience by default. A completed action records practice for the next attempt.
- Public target inspection should be trimmed if `Навички:` starts feeling too much like a stat sheet in live play.
- `src/utils/resourceText.ts` currently imports `creatureForms` from `src/services/grammar.ts`. This is safe while grammar does not import resource text, but a future cleanup should move resource/corpse text helpers closer to a dedicated text/content boundary.
- Consider replacing the first `scripts/test/resource-text.cjs` `Object.fromEntries(... === expected)` assertions with direct `assert.equal(...)` checks so failures show the mismatched resource string more clearly.

## Follow And Group Watchpoints

- Follow intent is attention context, not auto-follow by itself.
- Follow assist is opt-in and ordinary visible-exit only. Darkness, hidden routes, stale route memory and manual queued actions must block catch-up.
- Successful follow assist can add personal follow messages after route hints. If live play feels noisy, add throttled follow-assist polish instead of widening group movement.
- Travel groups are social/travel context only: no automatic group movement, shared combat, loot, inventory or hidden-route sharing until designed separately.

## Content And Ecology Watchpoints

- Do not turn the Lisovyk restoration-walk MVP into a broad forest rewrite. Future Lisovyk character work should deliberately choose whether he remains an old-forest mentor/watchful local presence or becomes a sharper spirit/threshold figure.
- Fauna diversity should keep hawks, frogs and snakes region-appropriate without widening into a full seasonal ecology simulation.
- Apiary content is a completed/testing endpoint for now: old log apiary, passive bumblebee hazard and risky honey/beeswax harvest exist; bear honey behavior and deeper honey/wax uses remain backlog/future.
- Map-gated pockets should stay small proofs of attention/light/tracks, not loot loops or broad skill-lock framework.

## Operational Watchpoints

- If event marker lookups keep growing, move hot cooldown/dedupe keys out of `description contains` scans and into structured storage.
- Keep planning status changes conservative. Retag only when the item itself clearly changed state, not just because the surrounding roadmap moved.
