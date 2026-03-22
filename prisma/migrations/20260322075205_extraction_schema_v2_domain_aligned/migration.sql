/*
  Warnings:

  - You are about to drop the column `cuisine_signals` on the `coverage_source_extractions` table. All the data in the column will be lost.
  - You are about to drop the column `offering_signals` on the `coverage_source_extractions` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "coverage_source_extractions" DROP COLUMN "cuisine_signals",
DROP COLUMN "offering_signals",
ADD COLUMN     "beverage_evidence" JSONB,
ADD COLUMN     "food_evidence" JSONB,
ADD COLUMN     "service_evidence" JSONB;
