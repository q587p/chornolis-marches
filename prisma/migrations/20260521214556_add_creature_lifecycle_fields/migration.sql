-- CreateEnum
CREATE TYPE "CreatureActivity" AS ENUM ('IDLE', 'MOVING', 'LOOKING', 'GATHERING', 'RESTING', 'TALKING', 'SPEAKING', 'FIGHTING', 'SETTING_TRAP');

-- CreateEnum
CREATE TYPE "WorldEventType" AS ENUM ('SYSTEM', 'PLAYER_ACTION', 'NPC_ACTION', 'MOVE', 'GATHER', 'SAY', 'ERROR', 'LOOK', 'GREET', 'INSPECT', 'GATHER_ATTEMPT', 'GATHER_SUCCESS', 'GATHER_FAIL', 'NPC_MOVE', 'NPC_SAY');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "CreatureAge" ADD VALUE 'CHILD';
ALTER TYPE "CreatureAge" ADD VALUE 'CORPSE';

-- AlterTable
ALTER TABLE "Creature" ADD COLUMN     "activity" "CreatureActivity",
ADD COLUMN     "ageTicks" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "corpseDecayTicksLeft" INTEGER,
ADD COLUMN     "currentAction" TEXT,
ADD COLUMN     "diedAtTick" INTEGER,
ADD COLUMN     "gatherAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "isGone" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "looks" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "maxHp" INTEGER,
ADD COLUMN     "says" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "steps" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "successfulGathers" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "stamina" SET DEFAULT 13;

-- AlterTable
ALTER TABLE "CreatureSpecies" ADD COLUMN     "adultTicks" INTEGER NOT NULL DEFAULT 72,
ADD COLUMN     "childTicks" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "corpseDecayTicks" INTEGER NOT NULL DEFAULT 24,
ADD COLUMN     "mushroomBonusOnDecay" INTEGER NOT NULL DEFAULT 2,
ADD COLUMN     "oldDeathChanceGrowthPermille" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "oldDeathChancePermille" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN     "oldTicks" INTEGER NOT NULL DEFAULT 36,
ADD COLUMN     "youngTicks" INTEGER NOT NULL DEFAULT 24;

-- AlterTable
ALTER TABLE "Player" ADD COLUMN     "animalsKilled" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "berriesGathered" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "gatherAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "greetings" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "herbsGathered" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastActionAt" TIMESTAMP(3),
ADD COLUMN     "looks" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "mushroomsGathered" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "says" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "steps" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "successfulGathers" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "stamina" SET DEFAULT 13;

-- AlterTable
ALTER TABLE "WorldAction" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "PlayerResource" (
    "id" SERIAL NOT NULL,
    "playerId" INTEGER NOT NULL,
    "resourceTypeId" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerResource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorldEvent" (
    "id" SERIAL NOT NULL,
    "type" "WorldEventType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "playerId" INTEGER,
    "locationId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorldEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlayerResource_playerId_resourceTypeId_key" ON "PlayerResource"("playerId", "resourceTypeId");

-- AddForeignKey
ALTER TABLE "PlayerResource" ADD CONSTRAINT "PlayerResource_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerResource" ADD CONSTRAINT "PlayerResource_resourceTypeId_fkey" FOREIGN KEY ("resourceTypeId") REFERENCES "ResourceType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorldEvent" ADD CONSTRAINT "WorldEvent_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "CellLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "WorldAction_actor_creature_status_position_idx" RENAME TO "WorldAction_actorType_creatureId_status_position_idx";

-- RenameIndex
ALTER INDEX "WorldAction_actor_player_status_position_idx" RENAME TO "WorldAction_actorType_playerId_status_position_idx";

-- RenameIndex
ALTER INDEX "WorldTrack_actor_creature_idx" RENAME TO "WorldTrack_actorType_creatureId_idx";

-- RenameIndex
ALTER INDEX "WorldTrack_actor_player_idx" RENAME TO "WorldTrack_actorType_playerId_idx";
