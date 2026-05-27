# Location Features

Location features are persistent objects attached to a location: signs, campfires, gates, bridges and future player-created markers.

## Interactive features

Only features with meaningful interaction should become buttons in the location UI.

`/look` should keep features as a compact list of visible things in the місцина. It should show a згасле вогнище simply as `Згасле вогнище`, without appending state text such as `згасло; не дає світла`.

`/examine` should explain what those features mean in play: a campfire gives light and improves rest, a torch stand has torches to take, a border marker helps with orientation, and so on. For extinguished campfires, prefer diegetic detail such as ash, blackened brands, and the lack of light or warmth instead of repeated technical state labels.

Current interactive examples:

- border marker: shows local orientation and nearby landmarks;
- campfire / magic campfire: explains light and rest effects;
- torch stand: shows that torches can be taken;
- closed gate: explains that the settlement path is locked for now.

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
