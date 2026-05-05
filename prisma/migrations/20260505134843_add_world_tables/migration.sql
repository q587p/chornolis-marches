-- CreateEnum
CREATE TYPE "BiomeType" AS ENUM ('FOREST', 'DEEP_FOREST', 'CLEARING', 'SWAMP', 'RIVER', 'HILL', 'CAVE', 'RUINS', 'VILLAGE');

-- CreateEnum
CREATE TYPE "Direction" AS ENUM ('NORTH', 'SOUTH', 'EAST', 'WEST', 'UP', 'DOWN', 'INSIDE', 'OUTSIDE');

-- CreateEnum
CREATE TYPE "CreatureKind" AS ENUM ('ANIMAL', 'HUMAN', 'MONSTER', 'SPIRIT');

-- CreateEnum
CREATE TYPE "DietType" AS ENUM ('HERBIVORE', 'CARNIVORE', 'OMNIVORE', 'SPIRITUAL');

-- CreateEnum
CREATE TYPE "CreatureSex" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "CreatureAge" AS ENUM ('YOUNG', 'ADULT', 'OLD');

-- AlterTable
ALTER TABLE "Player" ADD COLUMN     "currentLocationId" INTEGER,
ADD COLUMN     "hp" INTEGER NOT NULL DEFAULT 20,
ADD COLUMN     "hunger" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "stamina" INTEGER NOT NULL DEFAULT 20;

-- CreateTable
CREATE TABLE "Region" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Region_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CellLocation" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "regionId" INTEGER NOT NULL,
    "x" INTEGER NOT NULL,
    "y" INTEGER NOT NULL,
    "z" INTEGER NOT NULL DEFAULT 0,
    "biome" "BiomeType" NOT NULL DEFAULT 'FOREST',
    "dangerLevel" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CellLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LocationExit" (
    "id" SERIAL NOT NULL,
    "fromLocationId" INTEGER NOT NULL,
    "toLocationId" INTEGER NOT NULL,
    "direction" "Direction" NOT NULL,
    "label" TEXT,
    "travelCost" INTEGER NOT NULL DEFAULT 1,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LocationExit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreatureSpecies" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "kind" "CreatureKind" NOT NULL,
    "diet" "DietType" NOT NULL,
    "baseHp" INTEGER NOT NULL,
    "strength" INTEGER NOT NULL,
    "agility" INTEGER NOT NULL,
    "perception" INTEGER NOT NULL,
    "endurance" INTEGER NOT NULL,
    "instinct" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreatureSpecies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Creature" (
    "id" SERIAL NOT NULL,
    "speciesId" INTEGER NOT NULL,
    "locationId" INTEGER NOT NULL,
    "name" TEXT,
    "hp" INTEGER NOT NULL,
    "hunger" INTEGER NOT NULL DEFAULT 0,
    "stamina" INTEGER NOT NULL DEFAULT 20,
    "sex" "CreatureSex",
    "age" "CreatureAge" NOT NULL DEFAULT 'ADULT',
    "isAlive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Creature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResourceType" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "ResourceType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResourceNode" (
    "id" SERIAL NOT NULL,
    "locationId" INTEGER NOT NULL,
    "resourceTypeId" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL DEFAULT 0,
    "maxAmount" INTEGER NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResourceNode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Region_key_key" ON "Region"("key");

-- CreateIndex
CREATE UNIQUE INDEX "CellLocation_key_key" ON "CellLocation"("key");

-- CreateIndex
CREATE UNIQUE INDEX "CellLocation_regionId_x_y_z_key" ON "CellLocation"("regionId", "x", "y", "z");

-- CreateIndex
CREATE UNIQUE INDEX "LocationExit_fromLocationId_direction_key" ON "LocationExit"("fromLocationId", "direction");

-- CreateIndex
CREATE UNIQUE INDEX "CreatureSpecies_key_key" ON "CreatureSpecies"("key");

-- CreateIndex
CREATE UNIQUE INDEX "ResourceType_key_key" ON "ResourceType"("key");

-- CreateIndex
CREATE UNIQUE INDEX "ResourceNode_locationId_resourceTypeId_key" ON "ResourceNode"("locationId", "resourceTypeId");

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_currentLocationId_fkey" FOREIGN KEY ("currentLocationId") REFERENCES "CellLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CellLocation" ADD CONSTRAINT "CellLocation_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationExit" ADD CONSTRAINT "LocationExit_fromLocationId_fkey" FOREIGN KEY ("fromLocationId") REFERENCES "CellLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationExit" ADD CONSTRAINT "LocationExit_toLocationId_fkey" FOREIGN KEY ("toLocationId") REFERENCES "CellLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Creature" ADD CONSTRAINT "Creature_speciesId_fkey" FOREIGN KEY ("speciesId") REFERENCES "CreatureSpecies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Creature" ADD CONSTRAINT "Creature_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "CellLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceNode" ADD CONSTRAINT "ResourceNode_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "CellLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceNode" ADD CONSTRAINT "ResourceNode_resourceTypeId_fkey" FOREIGN KEY ("resourceTypeId") REFERENCES "ResourceType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
