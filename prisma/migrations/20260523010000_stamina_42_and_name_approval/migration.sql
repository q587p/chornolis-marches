-- Raise baseline stamina from 13 to 42 and prepare name approval tracking.

ALTER TABLE "Player" ADD COLUMN "isNameApproved" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Player" ALTER COLUMN "stamina" SET DEFAULT 42;
ALTER TABLE "Player" ALTER COLUMN "staminaMax" SET DEFAULT 42;
ALTER TABLE "Creature" ALTER COLUMN "stamina" SET DEFAULT 42;
ALTER TABLE "Creature" ALTER COLUMN "staminaMax" SET DEFAULT 42;

-- Preserve the old “super-rested starter” ratio for freshly created/onboarded players.
UPDATE "Player" SET "stamina" = 126 WHERE "stamina" = 39 AND "staminaMax" = 13;

-- Move default old-baseline entities to the new baseline.
UPDATE "Player" SET "stamina" = 42 WHERE "stamina" = 13;
UPDATE "Player" SET "staminaMax" = 42 WHERE "staminaMax" = 13;
UPDATE "Creature" SET "stamina" = 42 WHERE "stamina" = 13;
UPDATE "Creature" SET "staminaMax" = 42 WHERE "staminaMax" = 13;
