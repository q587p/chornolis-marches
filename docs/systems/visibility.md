# Visibility

Visibility is the shared layer between world time, weather, moonlight, torches, campfires and what a player can notice in a location.

The first `0.14.4` implementation is intentionally small:

- `src/services/lightSnapshot.ts` computes a light snapshot from daypart, moon illumination, weather and local active light.
- `src/services/visibility.ts` turns that light snapshot into simple visibility rules.
- Brief `Озирнутися` / `/look` now asks the shared visibility service whether nearby beings, ground objects and target buttons should be shown.
- Detailed `Роздивитися` / `/examine` is handled by the same visibility layer for location description, nearby details, resources, tracks, ground objects and feature detail summaries.

The `0.14.5` slice makes darkness player-visible:

- dim or dark visibility without local light hides the long location description behind atmospheric darkness copy;
- nearby beings, target buttons, loose ground objects, resources and track details are reduced or hidden without light;
- corpses count as ground objects for this rule: if light changes after an attack, corpse inspection, pickup and freshening buttons/actions must check visibility again at use/completion time and disappear or fail safely without light;
- `/track` uses the same visibility helper at completion time before revealing track lines;
- carried, dropped or feature-provided light can restore normal detail through the shared light snapshot.

The `0.15.27` slice closes the first feature-inspection leak:

- location features may still be listed as dark-safe silhouettes so players are not trapped by invisible navigation anchors;
- authored `examine_summary`, written marks, route hints and full feature descriptions are not shown without valid light;
- direct feature inspection in darkness returns a dark-safe outline message and a way back instead of revealing the full feature text;
- full feature details return normally when daylight, a lit torch, active campfire or other valid local light is present.

The `0.15.29` starter-lighting fix keeps this darkness rule, but adds one authored exception:

- the torch stand on `start_border_watchtower` provides narrow local light through reflected glow from the unfading campfire below;
- this lets beginners inspect and use the starter torch source at night without already carrying a lit torch;
- the exception is tied to the authored watchtower torch stand, not to all `starter_camp` locations, all `z = 1` locations or the starter cellar.

Future `VIS-001-B/C/D/E/F` slices should expand this same service instead of scattering darkness checks through handlers:

- finish feature-specific darkness hints and hidden-target lookup copy;
- keep observation-learning ready, but do not implement `/observe` or skill XP in `0.14.x`.

Player-facing copy should stay diegetic. Avoid raw “visibility score” text outside scribe/admin debug views.
