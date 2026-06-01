CREATE TYPE "PlayerSessionPresence" AS ENUM ('ACTIVE', 'AFK', 'ENDED');

ALTER TABLE "Player"
  ADD COLUMN "sessionPresence" "PlayerSessionPresence" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "remindersPaused" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "lastPlayerActionAt" TIMESTAMP(3);

UPDATE "Player"
SET "lastPlayerActionAt" = COALESCE("lastActionAt", "updatedAt", "createdAt");
