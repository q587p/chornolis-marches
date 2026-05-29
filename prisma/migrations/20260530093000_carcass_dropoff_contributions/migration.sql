CREATE TABLE "CarcassDropoffContribution" (
  "id" SERIAL NOT NULL,
  "dropoffFeatureKey" TEXT NOT NULL,
  "locationId" INTEGER,
  "contributorKind" TEXT NOT NULL DEFAULT 'PLAYER',
  "playerId" INTEGER,
  "creatureId" INTEGER,
  "resourceTypeKey" TEXT NOT NULL,
  "amount" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CarcassDropoffContribution_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CarcassDropoffContribution_dropoffFeatureKey_contributorKind_playerId_idx"
  ON "CarcassDropoffContribution"("dropoffFeatureKey", "contributorKind", "playerId");

CREATE INDEX "CarcassDropoffContribution_createdAt_idx"
  ON "CarcassDropoffContribution"("createdAt");
