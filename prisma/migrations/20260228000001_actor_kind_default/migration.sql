-- Set Actor.kind default to 'operator' (must run after enum value is committed)
ALTER TABLE "Actor" ALTER COLUMN "kind" SET DEFAULT 'operator';
