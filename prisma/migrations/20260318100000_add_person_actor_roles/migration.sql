-- Add person-role values to ActorRole enum
-- Enables mapping chefs, sommeliers, and beverage/wine directors to venues
ALTER TYPE "ActorRole" ADD VALUE IF NOT EXISTS 'chef';
ALTER TYPE "ActorRole" ADD VALUE IF NOT EXISTS 'sommelier';
ALTER TYPE "ActorRole" ADD VALUE IF NOT EXISTS 'pastry_chef';
ALTER TYPE "ActorRole" ADD VALUE IF NOT EXISTS 'beverage_director';
ALTER TYPE "ActorRole" ADD VALUE IF NOT EXISTS 'wine_director';
