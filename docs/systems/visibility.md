# Visibility

Visibility is the shared layer between world time, weather, moonlight, torches, campfires and what a player can notice in a location.

The first `0.14.4` implementation is intentionally small:

- `src/services/lightSnapshot.ts` computes a light snapshot from daypart, moon illumination, weather and local active light.
- `src/services/visibility.ts` turns that light snapshot into simple visibility rules.
- Brief `Озирнутися` / `/look` now asks the shared visibility service whether nearby beings, ground objects and target buttons should be shown.
- Detailed `Роздивитися` / `/examine` still shows full details for now.

The `0.14.5` slice makes darkness player-visible:

- dim or dark visibility without local light hides the long location description behind atmospheric darkness copy;
- nearby beings, target buttons, loose ground objects, resources and track details are reduced or hidden without light;
- `/track` uses the same visibility helper at completion time before revealing track lines;
- carried, dropped or feature-provided light can restore normal detail through the shared light snapshot.

Future `VIS-001-B/C/D/E/F` slices should expand this same service instead of scattering darkness checks through handlers:

- finish feature-specific darkness hints and hidden-target lookup copy;
- keep observation-learning ready, but do not implement `/observe` or skill XP in `0.14.x`.

Player-facing copy should stay diegetic. Avoid raw “visibility score” text outside scribe/admin debug views.
