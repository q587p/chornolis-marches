-- Speed up action queue polling for actor-specific due/runnable actions.
CREATE INDEX "WorldAction_actorType_status_executeAt_idx" ON "WorldAction"("actorType", "status", "executeAt");
CREATE INDEX "WorldAction_actorType_status_position_id_idx" ON "WorldAction"("actorType", "status", "position", "id");
