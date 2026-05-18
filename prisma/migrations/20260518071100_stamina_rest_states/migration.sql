-- Stamina, fatigue states and rest loop for 0.7.1.

CREATE TYPE "FatigueState" AS ENUM ('RESTED', 'TIRED', 'VERY_TIRED');

ALTER TABLE "Player"
  ADD COLUMN "staminaMax" INTEGER NOT NULL DEFAULT 13,
  ADD COLUMN "fatigueState" "FatigueState" NOT NULL DEFAULT 'RESTED',
  ADD COLUMN "isResting" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "lastStaminaRegenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "Creature"
  ADD COLUMN "staminaMax" INTEGER NOT NULL DEFAULT 13,
  ADD COLUMN "fatigueState" "FatigueState" NOT NULL DEFAULT 'RESTED',
  ADD COLUMN "lastStaminaRegenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "Player"
SET
  "staminaMax" = 13,
  "stamina" = LEAST("stamina", 13),
  "fatigueState" = CASE
    WHEN LEAST("stamina", 13) <= -39 THEN 'VERY_TIRED'::"FatigueState"
    WHEN LEAST("stamina", 13) < 0 THEN 'TIRED'::"FatigueState"
    ELSE 'RESTED'::"FatigueState"
  END,
  "isResting" = false,
  "lastStaminaRegenAt" = CURRENT_TIMESTAMP;

UPDATE "Creature"
SET
  "staminaMax" = 13,
  "stamina" = LEAST("stamina", 13),
  "fatigueState" = CASE
    WHEN LEAST("stamina", 13) <= -39 THEN 'VERY_TIRED'::"FatigueState"
    WHEN LEAST("stamina", 13) < 0 THEN 'TIRED'::"FatigueState"
    ELSE 'RESTED'::"FatigueState"
  END,
  "lastStaminaRegenAt" = CURRENT_TIMESTAMP;
