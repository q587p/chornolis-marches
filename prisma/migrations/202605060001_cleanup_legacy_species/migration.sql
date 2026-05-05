UPDATE "Creature"
SET
  "isAlive" = false,
  "currentAction" = 'зник у старій версії світу',
  "activity" = 'RESTING',
  "updatedAt" = NOW()
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