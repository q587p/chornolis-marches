# Location Features

Location features are persistent objects attached to a location: signs, campfires, gates, bridges and future player-created markers.

## Interactive features

Only features with meaningful interaction should become buttons in the location UI.

`/look` should keep features as a compact list of visible things in the місцина. It should show a згасле вогнище simply as `Згасле вогнище`, without appending state text such as `згасло; не дає світла`.

`/examine` should explain what those features mean in play: a campfire gives light and improves rest, a torch stand has torches to take, a border marker helps with orientation, and so on. For extinguished campfires, prefer diegetic detail such as ash, blackened brands, and the lack of light or warmth instead of repeated technical state labels.

Interactive features should also be inspectable by text where practical: `look лавка`, `/examine лавка`, `оглянути лавку`, `look bench`, `роздивитися кущі`. If no feature matches, the same text can fall back to ordinary visible target inspection.

Features may set `data.icon` when the generic type icon would make nearby landmarks blend together. The location renderer uses this icon in feature lists and feature buttons before falling back to type-based icons. Explicit icons in the same location should stay distinct where practical; reserve the fire icon for actual flame/campfire states and fire-lighting actions, not for an unlit torch supply.

Current interactive examples:

- border marker: shows local orientation and nearby landmarks;
- campfire / magic campfire: explains light and rest effects;
- torch stand: shows that torches can be taken;
- closed gate: explains that the settlement path is locked for now.

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
