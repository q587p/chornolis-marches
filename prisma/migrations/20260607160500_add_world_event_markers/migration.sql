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
CREATE INDEX "WorldEventMarker_markerKey_scopeType_createdAt_idx" ON "WorldEventMarker"("markerKey", "scopeType", "createdAt");

-- CreateIndex
CREATE INDEX "WorldEventMarker_markerKey_scopeType_playerId_createdAt_idx" ON "WorldEventMarker"("markerKey", "scopeType", "playerId", "createdAt");

-- CreateIndex
CREATE INDEX "WorldEventMarker_markerKey_scopeType_playerId_locationId_createdAt_idx" ON "WorldEventMarker"("markerKey", "scopeType", "playerId", "locationId", "createdAt");

-- CreateIndex
CREATE INDEX "WorldEventMarker_markerKey_scopeType_playerId_targetType_targetId_createdAt_idx" ON "WorldEventMarker"("markerKey", "scopeType", "playerId", "targetType", "targetId", "createdAt");

-- CreateIndex
CREATE INDEX "WorldEventMarker_markerKey_scopeType_creatureId_createdAt_idx" ON "WorldEventMarker"("markerKey", "scopeType", "creatureId", "createdAt");

-- CreateIndex
CREATE INDEX "WorldEventMarker_markerKey_scopeType_locationId_createdAt_idx" ON "WorldEventMarker"("markerKey", "scopeType", "locationId", "createdAt");

-- CreateIndex
CREATE INDEX "WorldEventMarker_expiresAt_idx" ON "WorldEventMarker"("expiresAt");
