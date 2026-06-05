CREATE TABLE "CreatureLearningProgress" (
  "id" SERIAL NOT NULL,
  "creatureId" INTEGER NOT NULL,
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

  CONSTRAINT "CreatureLearningProgress_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CreatureLearningProgress_creatureId_skillKey_sourceKey_contextKey_key"
  ON "CreatureLearningProgress"("creatureId", "skillKey", "sourceKey", "contextKey");

CREATE INDEX "CreatureLearningProgress_creatureId_skillKey_idx"
  ON "CreatureLearningProgress"("creatureId", "skillKey");

CREATE INDEX "CreatureLearningProgress_skillKey_sourceKey_idx"
  ON "CreatureLearningProgress"("skillKey", "sourceKey");

ALTER TABLE "CreatureLearningProgress"
  ADD CONSTRAINT "CreatureLearningProgress_creatureId_fkey"
  FOREIGN KEY ("creatureId") REFERENCES "Creature"("id") ON DELETE CASCADE ON UPDATE CASCADE;
