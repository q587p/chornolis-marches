-- Persistent universal action queue for players, NPCs and animals.

CREATE TYPE "WorldActorType" AS ENUM ('PLAYER', 'CREATURE');
CREATE TYPE "WorldActionType" AS ENUM (
  'MOVE',
  'GATHER',
  'GATHER_SPECIFIC',
  'EAT',
  'LOOK',
  'INSPECT',
  'GREET',
  'ATTACK',
  'FRESHEN',
  'SAY',
  'TRACK',
  'REST',
  'SET_TRAP',
  'WAIT'
);
CREATE TYPE "WorldActionStatus" AS ENUM ('QUEUED', 'RUNNING', 'DONE', 'FAILED', 'CANCELLED');

CREATE TABLE "WorldAction" (
  "id" SERIAL PRIMARY KEY,
  "actorType" "WorldActorType" NOT NULL,
  "playerId" INTEGER,
  "creatureId" INTEGER,
  "type" "WorldActionType" NOT NULL,
  "status" "WorldActionStatus" NOT NULL DEFAULT 'QUEUED',
  "payload" JSONB NOT NULL,
  "position" INTEGER NOT NULL,
  "durationMs" INTEGER NOT NULL,
  "startedAt" TIMESTAMP(3),
  "executeAt" TIMESTAMP(3),
  "chatId" TEXT,
  "messageId" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WorldAction_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "WorldAction_creatureId_fkey" FOREIGN KEY ("creatureId") REFERENCES "Creature"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "WorldAction_actor_target_check" CHECK (
    ("actorType" = 'PLAYER' AND "playerId" IS NOT NULL AND "creatureId" IS NULL)
    OR
    ("actorType" = 'CREATURE' AND "creatureId" IS NOT NULL AND "playerId" IS NULL)
  )
);

CREATE INDEX "WorldAction_actor_player_status_position_idx" ON "WorldAction"("actorType", "playerId", "status", "position");
CREATE INDEX "WorldAction_actor_creature_status_position_idx" ON "WorldAction"("actorType", "creatureId", "status", "position");
CREATE INDEX "WorldAction_status_executeAt_idx" ON "WorldAction"("status", "executeAt");
