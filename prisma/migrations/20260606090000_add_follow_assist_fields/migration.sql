-- Add opt-in guarded follow assist state to the existing follow intent marker.
ALTER TABLE "PlayerFollowIntent"
  ADD COLUMN "assistEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "assistUpdatedAt" TIMESTAMP(3),
  ADD COLUMN "lastAssistAt" TIMESTAMP(3);
