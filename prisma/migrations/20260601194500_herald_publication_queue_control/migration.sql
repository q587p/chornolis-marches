CREATE TABLE "HeraldPublicationQueueControl" (
  "id" INTEGER NOT NULL DEFAULT 1,
  "isPaused" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "HeraldPublicationQueueControl_pkey" PRIMARY KEY ("id")
);
