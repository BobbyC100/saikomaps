-- AlterTable
ALTER TABLE "places" ADD COLUMN     "tips" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "vibe_tags" TEXT[] DEFAULT ARRAY[]::TEXT[];
