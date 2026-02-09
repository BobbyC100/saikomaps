-- AlterTable
ALTER TABLE "places" ADD COLUMN     "intent_profile" TEXT,
ADD COLUMN     "intent_profile_override" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reservation_url" TEXT;
