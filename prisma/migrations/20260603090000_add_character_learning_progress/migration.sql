CREATE TABLE "CharacterLearningProgress" (
  "id" SERIAL NOT NULL,
  "playerId" INTEGER NOT NULL,
  "skillKey" TEXT NOT NULL,
  "sourceKey" TEXT NOT NULL DEFAULT 'practice',
  "contextKey" TEXT NOT NULL DEFAULT 'general',
  "level" INTEGER NOT NULL DEFAULT 0,
  "progress" INTEGER NOT NULL DEFAULT 0,
  "totalProgress" INTEGER NOT NULL DEFAULT 0,
  "milestoneCount" INTEGER NOT NULL DEFAULT 0,
  "lastSourceEventId" INTEGER,
  "discoveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CharacterLearningProgress_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CharacterLearningProgress_playerId_skillKey_sourceKey_contextKey_key"
  ON "CharacterLearningProgress"("playerId", "skillKey", "sourceKey", "contextKey");

CREATE INDEX "CharacterLearningProgress_playerId_skillKey_idx"
  ON "CharacterLearningProgress"("playerId", "skillKey");

CREATE INDEX "CharacterLearningProgress_skillKey_sourceKey_idx"
  ON "CharacterLearningProgress"("skillKey", "sourceKey");

ALTER TABLE "CharacterLearningProgress"
  ADD CONSTRAINT "CharacterLearningProgress_playerId_fkey"
  FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
