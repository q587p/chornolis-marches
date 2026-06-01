-- CreateTable
CREATE TABLE "ServiceHeartbeat" (
    "serviceKey" TEXT NOT NULL,
    "mode" TEXT,
    "startedAt" TIMESTAMP(3),
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceHeartbeat_pkey" PRIMARY KEY ("serviceKey")
);
