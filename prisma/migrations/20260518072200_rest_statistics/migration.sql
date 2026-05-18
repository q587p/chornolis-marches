-- Rest statistics for 0.7.2 supplement.

ALTER TABLE "Player"
  ADD COLUMN IF NOT EXISTS "restStarts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "restFullRecoveries" INTEGER NOT NULL DEFAULT 0;
