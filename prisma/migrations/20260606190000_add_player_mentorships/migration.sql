-- Add narrow player-to-local-character mentorship offer storage.
CREATE TABLE "PlayerMentorship" (
  "id" SERIAL NOT NULL,
  "playerId" INTEGER NOT NULL,
  "mentorCreatureId" INTEGER NOT NULL,
  "skillKey" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'OFFERED',
  "offeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "acceptedAt" TIMESTAMP(3),
  "declinedAt" TIMESTAMP(3),
  "endedAt" TIMESTAMP(3),
  "lastPromptAt" TIMESTAMP(3),
  "clarificationCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PlayerMentorship_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PlayerMentorship_playerId_status_idx" ON "PlayerMentorship"("playerId", "status");
CREATE INDEX "PlayerMentorship_mentorCreatureId_status_idx" ON "PlayerMentorship"("mentorCreatureId", "status");
CREATE INDEX "PlayerMentorship_playerId_mentorCreatureId_skillKey_status_idx" ON "PlayerMentorship"("playerId", "mentorCreatureId", "skillKey", "status");

ALTER TABLE "PlayerMentorship"
  ADD CONSTRAINT "PlayerMentorship_playerId_fkey"
  FOREIGN KEY ("playerId") REFERENCES "Player"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PlayerMentorship"
  ADD CONSTRAINT "PlayerMentorship_mentorCreatureId_fkey"
  FOREIGN KEY ("mentorCreatureId") REFERENCES "Creature"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
