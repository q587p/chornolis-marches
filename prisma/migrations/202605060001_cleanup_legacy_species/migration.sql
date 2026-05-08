UPDATE "Creature"
SET
  "isAlive" = false
WHERE "speciesId" IN (
  SELECT "id"
  FROM "CreatureSpecies"
  WHERE "key" IN ('lesovyk', 'human_herbalist')
);

UPDATE "CreatureSpecies"
SET
  "description" = COALESCE("description", '') || ' [legacy: replaced by lisovyk/herbalist]',
  "updatedAt" = NOW()
WHERE "key" IN ('lesovyk', 'human_herbalist');