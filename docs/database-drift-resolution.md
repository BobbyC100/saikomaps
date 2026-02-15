# Database Drift Resolution Guide

## What is Drift?

Drift occurs when your actual database schema doesn't match the schema described by your Prisma migration history. This typically happens when:

- Schema changes are applied via `prisma db push` instead of migrations
- Manual SQL changes are made directly to the database
- Migrations are deleted or modified after being applied

## Detecting Drift

Run the status check:

```bash
npx prisma migrate status
```

**Clean state (no drift):**
```
Database schema is up to date!
```

**Drift detected:**
```
Drift detected: Your database schema is not in sync with your migration history.
[... detailed list of differences ...]
```

---

## Resolution: Create a Baseline Migration

This process records the current database state as migration history **without modifying any data**.

### Step 1: Pull Current Schema

Introspect the database to update your schema file:

```bash
npx prisma db pull
```

This updates `prisma/schema.prisma` to match your actual database.

### Step 2: Create Baseline Migration

Generate a migration that represents the current state:

```bash
# Create migration directory
mkdir -p prisma/migrations/00000000000000_baseline

# Generate SQL from empty → current schema
npx prisma migrate diff \
  --from-empty \
  --to-schema-datamodel prisma/schema.prisma \
  --script > prisma/migrations/00000000000000_baseline/migration.sql
```

**Important:** This SQL is for documentation only. It will NOT be executed against your database.

### Step 3: Mark Baseline as Applied

Tell Prisma that this migration is already reflected in the database:

```bash
npx prisma migrate resolve --applied 00000000000000_baseline
```

This command:
- ✅ Updates migration history
- ❌ Does NOT execute any SQL
- ❌ Does NOT modify any data

### Step 4: Verify Resolution

```bash
npx prisma migrate status
```

Should now show: **"Database schema is up to date!"**

---

## Future Migrations

After resolving drift, all new schema changes must follow the proper workflow:

```bash
# 1. Edit prisma/schema.prisma
# 2. Create migration
npx prisma migrate dev --name descriptive_name

# 3. Verify
npx prisma migrate status
```

---

## Troubleshooting

### "Migration X has not yet been applied"

If you see migrations listed as unapplied but the columns already exist in your database:

```bash
# Mark each as applied (replace with actual migration name)
npx prisma migrate resolve --applied 20260214_migration_name
```

### Shadow Database Issues

If you see errors about shadow databases:

1. Ensure your database user has permission to create databases
2. Or set `shadowDatabaseUrl` in your schema datasource to a separate DB

### Production Databases

**Never use baseline resolution in production.** Instead:

1. Test migrations in staging environment
2. Use `prisma migrate deploy` in production (applies pending migrations only)
3. Maintain clean migration history from development through all environments

---

## Prevention

- Always use `prisma migrate dev` for schema changes
- Never use `prisma db push` for persistent databases
- Commit both `schema.prisma` and `migrations/` folder together
- Run `prisma migrate status` in CI to catch drift early

---

**Last Updated:** 2026-02-15  
**Related:** README.md > Development > Database Migrations
