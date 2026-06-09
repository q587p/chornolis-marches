# Location Features

Location features are persistent objects attached to a location: signs, campfires, gates, bridges and future player-created markers. The same `look` / `examine` distinction should also guide visible creatures, objects, spirits and location content, even when they are not modeled as `LocationFeature` rows.

## Interactive features

Only features with meaningful interaction should become buttons in the location UI.

`/look` should keep features as a compact list of visible things in the місцина. It should show a згасле вогнище simply as `Згасле вогнище`, without appending state text such as `згасло; не дає світла`.

`/examine` should explain what those features mean in play: a campfire gives light and improves rest, a torch stand has torches to take, a border marker helps with orientation, and so on. For extinguished campfires, prefer diegetic detail such as ash, blackened brands, and the lack of light or warmth instead of repeated technical state labels.

Every visible feature should usually have two layers of text:

- `look` / location overview: a compact visible label or one-line description.
- `examine` / direct feature inspection: a deeper explanation with at least one useful detail, interaction hint, constraint, local consequence or atmospheric clue.

If `look ворота` and `examine ворота`, or similar direct feature commands, produce the same text, treat that as a bug or an explicit no-action decision to document. The default should be that direct examination adds something the overview did not say.

For any new visible target, keep the two inspection layers distinct:

- `look <thing>` should answer "what is visibly here right now?" with compact state, posture or orientation.
- `examine <thing>` should answer "what do I understand by spending more attention/stamina?" with substantially richer detail.

When possible, `examine` text should also vary by relevant world context such as daypart, moonlight, weather, active light, fire state, local danger, recent actions or the viewer's future observation skill. If contextual variants do not fit the current slice, record a follow-up task instead of letting the target permanently ship with identical brief/full text.

Interactive features should also be inspectable by text where practical: `look лавка`, `/examine лавка`, `оглянути лавку`, `look bench`, `роздивитися кущі`. If no feature matches, the same text can fall back to ordinary visible target inspection.

Features may set `data.icon` when the generic type icon would make nearby landmarks blend together. The location renderer uses this icon in feature lists and feature buttons before falling back to type-based icons. Explicit icons in the same location should stay distinct where practical; reserve the fire icon for actual flame/campfire states and fire-lighting actions, not for an unlit torch supply.

Feature icons and command icons should not collide in the same UI surface when avoidable. A command button that shares the exact icon of a nearby feature can look like a feature action rather than a global command; future icon audits should check both feature buttons and ordinary command buttons together.

Feature fields are content, not trusted markup. Anything from feature `name`, `description`, aliases or `data` that enters a Telegram HTML message must be escaped with `escapeHtml` or a shared formatter before interpolation. Keep authored emphasis/quote wrappers outside the data string so feature inspection cannot accidentally inject raw HTML.

Do not put raw HTML tags such as `<i>...</i>` directly into `prisma/data/world/*.json` descriptions. Location overview text is escaped before Telegram sends it, so authored tags will be shown literally to players. Use plain prose in seed data, and add any intentional HTML emphasis in the renderer after escaping the content. `scripts/test/world-content-html.cjs` guards this for world JSON and the legacy seed mirror.

Current interactive examples:

- border marker: shows local orientation and nearby landmarks;
- campfire / magic campfire: explains light and rest effects;
- torch stand: shows that torches can be taken;
- closed gate: explains that the settlement path is locked for now.
- gate notice / carcass drop-off: should explain what the settlement is asking for, what can be put there and why it matters, not only list the sign or pit by name.
- climbable tree: a surface feature that advertises an `UP` exit to a real upper location and a matching `DOWN` exit back to the base location.
- authored vertical landmark: a feature can expose `data.vertical_hint = "UP"` to add a direct movement button such as `Вгору` when inspected, while the real movement still uses the ordinary exit graph.
- shakeable branches: an upper-tree feature with a cooldown; `/examine` should explain whether dry twigs can be shaken down now or whether the tree needs time before it gives more.
- shared beginner cache: a starter-camp/watchtower supply feature with small qualitative stock, focused take/contribute buttons and hidden unobserved restock stored in feature data. It is early mutual support, not a shop or fixed reward loop.
- empty-bottle niche: a narrow starter-cellar/root-pocket utility feature with `data.empty_bottle_source = true`; `/examine` should explain that one `порожня пляшечка` can be taken for future herbal preparations. The authored source remains non-depleting for now, but its source path stops giving bottles once the player already carries 3 `empty_bottle`. It is intentionally not a broad loot cache, shop, recipe UI, potion source or global inventory system.
- strange totem: a dry `LANDMARK` with `data.strange_totem = true`; `/look` lists it compactly, `/examine` explains its age and suspicious construction, and `Розібрати` / `/dismantle_totem` queues a dismantle action that can recover `twigs`.

## Strange Totems

Strange Totems are the first small ambient wilderness trace for dry luka, riverbank, Chornolis border and willow floodplain locations.

- Seeded and spawned totems are `LocationFeature` rows with type `LANDMARK`, `isActive = true` and `data.strange_totem = true`.
- The compact location overview should treat them like visible features. Direct feature inspection should explain whether the totem looks fresh, old or close to falling apart.
- `DISMANTLE_TOTEM` is a queued action. It is exposed through the feature button, `/dismantle_totem`, slashless English aliases such as `dismantle totem`, and Ukrainian aliases such as `розібрати тотем`.
- Fresh active totems recover a small variable amount of `twigs`; old last-day totems recover less.
- Totems become old after six in-game days and expire after seven in-game days.
- During the old last-day window, a totem can shed one small `twigs` bundle onto the ground. This drop is idempotent and recorded in feature data.
- The world tick can attempt one ambient totem spawn per in-game day in enabled regions. Region caps keep active totems bounded: `dry_luka=13`, `riverbank=3`, `chornolis_border=5` and `willow_floodplain=1`.
- Ambient spawns avoid locations with active players, avoid places that already have an active Strange Totem, avoid visible non-animal NPC/monster/spirit presence, and keep protected/special places such as the starter camp/watchtower/cellar, old bridge spans, the under-bridge passage, dream tutorial and closed settlement gate excluded.
- Ambient spawned totems use regional description pools: dry luka variants lean on dry grass, stems and open-meadow signs; riverbank variants lean on water, mud, reeds, driftwood and wet roots; Chornolis border variants lean on old roots, tree-shadow and threshold flavor; willow floodplain has one rare wetland/floodplain flavor.
- Ambient spawns leave one suspicious track toward a visible exit. The current implementation uses a hidden technical `strange_totem_trace` actor for the `WorldTrack` relation; player-facing text should describe only the suspicious trace, not the technical actor.

Future authored-data cleanup:

- Repeated Strange Totem defaults should move toward `TECH-002` feature archetypes/templates instead of duplicating the same icon, aliases, twig yields and static top-level fields in every world JSON row.
- Individual feature rows should keep only location-specific overrides once that authoring layer exists.

Current tree-shake MVP limits:

- The tree-shake cooldown is stored in `Feature.data.last_shaken_at`, so a reset/reseed can reset it. This is acceptable for the first slice, but a later cleanup should move renewable-feature cooldowns to a persistent runtime/event model.
- `Потрусити дерево` / `/shake_tree` is immediate after the usual permission/location checks. If shaking should cost time, stamina, noise or risk, move it to the action queue like gathering.

Planned interactive examples:

- shrine / `капище`: a sacred-place feature that can accept small offerings such as a `шаг`, хмиз, herbs or other fitting items. The first version should record the offering and change local feature text or events; later versions can connect offerings to dreams, omens, spirits, calendar days, weather or local safety.
- animal charm / small statue: a hare statue, mouse stone, carved burrow marker or similar forest feature that can accept fitting offerings such as berries or herbs. The first version should use a queued delay, cooldown and population threshold; if rabbits or mice are depleted nearby, the feature may later bring a pair of young animals into the world.

## Passive features

Some features are terrain or technical metadata and should not become buttons until they have gameplay.

Current passive example:

- old bridge / bridge span: kept as location/terrain context, but not clickable yet.

## Future use

Bridge metadata should later support:

- fishing from bridge or riverbank;
- bridge repair/damage;
- crossing risks;
- traces on planks;
- possible control points between regions.

Campfires should later support:

- player or NPC creation;
- fuel and time-based fading;
- relighting;
- smoke/light visibility;
- different rest caps or safety effects.

Shrines should later support:

- diegetic inspection through `/examine`;
- offering actions with item removal and local traces;
- non-obvious consequences rather than fixed shop-like rewards;
- calendar, dream, spirit, reputation or omen hooks after those systems exist.

Animal-restoration charms should later support:

- diegetic inspection through `/examine`;
- offerings such as berries, herbs or other small living gifts;
- delayed local or regional prey recovery when populations are critically low;
- global or regional warning text from Дід Лісовик when prey species disappear;
- strict caps and cooldowns so the loop repairs ecological collapse without becoming a farmable spawn shop.
