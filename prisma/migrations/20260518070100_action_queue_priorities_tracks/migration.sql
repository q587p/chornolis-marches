-- Action queue priorities, interrupts and first world tracks.

ALTER TABLE "WorldAction"
  ADD COLUMN "priority" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "interruptible" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "note" TEXT;

CREATE INDEX "WorldAction_status_priority_position_idx" ON "WorldAction"("status", "priority", "position");

CREATE TABLE "WorldTrack" (
  "id" SERIAL PRIMARY KEY,
  "actorType" "WorldActorType" NOT NULL,
  "playerId" INTEGER,
  "creatureId" INTEGER,
  "fromLocationId" INTEGER NOT NULL,
  "toLocationId" INTEGER NOT NULL,
  "direction" "Direction" NOT NULL,
  "label" TEXT NOT NULL,
  "strength" INTEGER NOT NULL DEFAULT 3,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WorldTrack_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "WorldTrack_creatureId_fkey" FOREIGN KEY ("creatureId") REFERENCES "Creature"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "WorldTrack_fromLocationId_fkey" FOREIGN KEY ("fromLocationId") REFERENCES "CellLocation"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "WorldTrack_toLocationId_fkey" FOREIGN KEY ("toLocationId") REFERENCES "CellLocation"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "WorldTrack_actor_target_check" CHECK (
    ("actorType" = 'PLAYER' AND "playerId" IS NOT NULL AND "creatureId" IS NULL)
    OR
    ("actorType" = 'CREATURE' AND "creatureId" IS NOT NULL AND "playerId" IS NULL)
  )
);

CREATE INDEX "WorldTrack_fromLocationId_expiresAt_idx" ON "WorldTrack"("fromLocationId", "expiresAt");
CREATE INDEX "WorldTrack_toLocationId_expiresAt_idx" ON "WorldTrack"("toLocationId", "expiresAt");
CREATE INDEX "WorldTrack_actor_player_idx" ON "WorldTrack"("actorType", "playerId");
CREATE INDEX "WorldTrack_actor_creature_idx" ON "WorldTrack"("actorType", "creatureId");
