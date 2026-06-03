-- Add a narrow, persistent attention marker for future observation/track-learning.
CREATE TABLE "PlayerFollowIntent" (
    "id" SERIAL NOT NULL,
    "playerId" INTEGER NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetPlayerId" INTEGER,
    "targetCreatureId" INTEGER,
    "setAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenLocationId" INTEGER,
    "lastKnownTargetLabel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerFollowIntent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PlayerFollowIntent_playerId_key" ON "PlayerFollowIntent"("playerId");
CREATE INDEX "PlayerFollowIntent_targetType_targetPlayerId_idx" ON "PlayerFollowIntent"("targetType", "targetPlayerId");
CREATE INDEX "PlayerFollowIntent_targetType_targetCreatureId_idx" ON "PlayerFollowIntent"("targetType", "targetCreatureId");
CREATE INDEX "PlayerFollowIntent_lastSeenLocationId_idx" ON "PlayerFollowIntent"("lastSeenLocationId");

ALTER TABLE "PlayerFollowIntent"
    ADD CONSTRAINT "PlayerFollowIntent_playerId_fkey"
    FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PlayerFollowIntent"
    ADD CONSTRAINT "PlayerFollowIntent_targetPlayerId_fkey"
    FOREIGN KEY ("targetPlayerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PlayerFollowIntent"
    ADD CONSTRAINT "PlayerFollowIntent_targetCreatureId_fkey"
    FOREIGN KEY ("targetCreatureId") REFERENCES "Creature"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PlayerFollowIntent"
    ADD CONSTRAINT "PlayerFollowIntent_lastSeenLocationId_fkey"
    FOREIGN KEY ("lastSeenLocationId") REFERENCES "CellLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
