-- Add pragmatic lookup indexes for recent WorldEvent-backed learning, follow,
-- chronicle and cooldown/dedupe paths. Description contains/exact marker
-- checks still need future structured marker storage if they become hot.
CREATE INDEX "WorldEvent_title_createdAt_idx" ON "WorldEvent"("title", "createdAt");
CREATE INDEX "WorldEvent_title_locationId_createdAt_idx" ON "WorldEvent"("title", "locationId", "createdAt");
CREATE INDEX "WorldEvent_title_playerId_createdAt_idx" ON "WorldEvent"("title", "playerId", "createdAt");
CREATE INDEX "WorldEvent_playerId_createdAt_idx" ON "WorldEvent"("playerId", "createdAt");
CREATE INDEX "WorldEvent_locationId_createdAt_idx" ON "WorldEvent"("locationId", "createdAt");
CREATE INDEX "WorldEvent_type_createdAt_idx" ON "WorldEvent"("type", "createdAt");
