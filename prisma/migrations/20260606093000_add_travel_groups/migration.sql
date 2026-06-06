-- Add minimal consensual travel group storage.
CREATE TABLE "TravelGroup" (
  "id" SERIAL NOT NULL,
  "leaderPlayerId" INTEGER NOT NULL,
  "name" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "TravelGroup_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TravelGroupMember" (
  "id" SERIAL NOT NULL,
  "groupId" INTEGER NOT NULL,
  "playerId" INTEGER NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'MEMBER',
  "status" TEXT NOT NULL DEFAULT 'INVITED',
  "invitedByPlayerId" INTEGER,
  "joinedAt" TIMESTAMP(3),
  "leftAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "TravelGroupMember_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TravelGroup_leaderPlayerId_idx" ON "TravelGroup"("leaderPlayerId");
CREATE INDEX "TravelGroupMember_groupId_status_idx" ON "TravelGroupMember"("groupId", "status");
CREATE INDEX "TravelGroupMember_playerId_status_idx" ON "TravelGroupMember"("playerId", "status");
CREATE INDEX "TravelGroupMember_invitedByPlayerId_idx" ON "TravelGroupMember"("invitedByPlayerId");

ALTER TABLE "TravelGroup"
  ADD CONSTRAINT "TravelGroup_leaderPlayerId_fkey"
  FOREIGN KEY ("leaderPlayerId") REFERENCES "Player"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TravelGroupMember"
  ADD CONSTRAINT "TravelGroupMember_groupId_fkey"
  FOREIGN KEY ("groupId") REFERENCES "TravelGroup"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TravelGroupMember"
  ADD CONSTRAINT "TravelGroupMember_playerId_fkey"
  FOREIGN KEY ("playerId") REFERENCES "Player"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TravelGroupMember"
  ADD CONSTRAINT "TravelGroupMember_invitedByPlayerId_fkey"
  FOREIGN KEY ("invitedByPlayerId") REFERENCES "Player"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
