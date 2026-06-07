-- CreateTable
CREATE TABLE "WorldEventMarker" (
    "id" SERIAL NOT NULL,
    "markerKey" TEXT NOT NULL,
    "scopeType" TEXT NOT NULL,
    "playerId" INTEGER,
    "creatureId" INTEGER,
    "locationId" INTEGER,
    "targetType" TEXT,
    "targetId" INTEGER,
    "sourceEventId" INTEGER,
    "worldEventId" INTEGER,
    "contextKey" TEXT,
    "metadata" JSONB,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorldEventMarker_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorldEventMarker_markerKey_createdAt_idx" ON "WorldEventMarker"("markerKey", "createdAt");

-- CreateIndex
CREATE INDEX "WorldEventMarker_markerKey_playerId_createdAt_idx" ON "WorldEventMarker"("markerKey", "playerId", "createdAt");

-- CreateIndex
CREATE INDEX "WorldEventMarker_markerKey_playerId_locationId_createdAt_idx" ON "WorldEventMarker"("markerKey", "playerId", "locationId", "createdAt");

-- CreateIndex
CREATE INDEX "WorldEventMarker_markerKey_playerId_targetType_targetId_createdAt_idx" ON "WorldEventMarker"("markerKey", "playerId", "targetType", "targetId", "createdAt");

-- CreateIndex
CREATE INDEX "WorldEventMarker_markerKey_creatureId_createdAt_idx" ON "WorldEventMarker"("markerKey", "creatureId", "createdAt");

-- CreateIndex
CREATE INDEX "WorldEventMarker_markerKey_locationId_createdAt_idx" ON "WorldEventMarker"("markerKey", "locationId", "createdAt");

-- CreateIndex
CREATE INDEX "WorldEventMarker_expiresAt_idx" ON "WorldEventMarker"("expiresAt");
