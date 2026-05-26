# Fire and light

Chornolis uses fire as an early survival and visibility tool.

## Campfires

- `/addCampfire` creates a new ordinary debug campfire in the player's current місцина.
- Multiple campfires can exist in the same місцина; every debug campfire receives its own key.
- A debug campfire burns for 8 in-game hours, currently mapped to 16 real minutes.
- During the final 2 in-game hours, currently 4 real minutes, location and feature text notes that the fire is fading.
- After at least 1 in-game hour, currently 2 real minutes, a campfire feature can show `Додати хмиз`.
- `Додати хмиз` and `/add twigs campfire` are reserved placeholders for the later firewood loop.
- When a timed campfire expires, it remains in the місцина as `Згасле вогнище`: it gives no light and no rest bonus.
- A character with a still-burning torch can use `Підпалити` on a згасле вогнище to relight it with the default ordinary campfire timer.
- Seed data includes a few згаслі вогнища in the forest and dry luka as places that can be relit.

Expired timed campfires are turned into згаслі campfires lazily when location/light state is rendered or checked.

## Torches

- Seed data includes a few loose `факел` ground items in forest, dry luka and riverbank locations. They appear under `Лежить` and can be picked up without a gather chance roll or action delay when the character is not exhausted.
- `/start`, `/reset` and ordinary bot startup do not add torches directly to player inventory. Development/scribe placement uses `/addTorch [персонаж]`, which adds a torch to the current or named player's `Речі`.
- Near an active light-giving campfire, a character with a torch can use `Підпалити факел`.
- If the torch is already burning, the same action becomes `Оновити вогонь на факелі` and resets its timer.
- A lit torch lasts 5 in-game hours, currently 10 real minutes.
- During the final in-game hour, currently 2 real minutes, character/location text warns that the torch is going out.
- A lit torch gives light in the character's current місцина and can reveal nearby targets in the same way as campfire light.

The current implementation stores torch state as inventory resources:

- `torch` is an unlit torch.
- `lit_torch` is a burning torch; its `updatedAt` timestamp is the active timer.

This avoids a schema migration while preserving per-character torch timing.
