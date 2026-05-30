-- Give NPCs and other creatures a real carried-resource table.
CREATE TABLE "CreatureResource" (
    "id" SERIAL NOT NULL,
    "creatureId" INTEGER NOT NULL,
    "resourceTypeId" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreatureResource_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CreatureResource_creatureId_resourceTypeId_key" ON "CreatureResource"("creatureId", "resourceTypeId");
CREATE INDEX "CreatureResource_resourceTypeId_idx" ON "CreatureResource"("resourceTypeId");

ALTER TABLE "CreatureResource" ADD CONSTRAINT "CreatureResource_creatureId_fkey" FOREIGN KEY ("creatureId") REFERENCES "Creature"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CreatureResource" ADD CONSTRAINT "CreatureResource_resourceTypeId_fkey" FOREIGN KEY ("resourceTypeId") REFERENCES "ResourceType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
