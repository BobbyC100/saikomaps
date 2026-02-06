# Database Setup for Saiko Maps

## Error: "User was denied access on the database"

This usually means PostgreSQL isn't running, or your `DATABASE_URL` has wrong credentials.

---

## 1. Install & run PostgreSQL

### Option A: Postgres.app (easiest on Mac)

1. Download [Postgres.app](https://postgresapp.com/)
2. Open it and click "Initialize" to start the server
3. Add to your PATH: `sudo mkdir -p /etc/paths.d && echo /Applications/Postgres.app/Contents/Versions/latest/bin | sudo tee /etc/paths.d/postgresapp`
4. Restart your terminal

**Default connection:** `postgresql://localhost:5432` (no username/password for local)

### Option B: Homebrew

```bash
brew install postgresql@16
brew services start postgresql@16
```

**Default:** User = your Mac username, no password. Database = your username by default.

---

## 2. Create the database

```bash
# With Postgres.app or Homebrew, create the DB:
createdb saiko_maps
```

---

## 3. Set DATABASE_URL in .env

**Postgres.app (typical):**
```
DATABASE_URL="postgresql://localhost:5432/saiko_maps"
```

**Homebrew (use your Mac username):**
```
DATABASE_URL="postgresql://YOUR_MAC_USERNAME@localhost:5432/saiko_maps"
```

**With password (if you set one):**
```
DATABASE_URL="postgresql://username:yourpassword@localhost:5432/saiko_maps"
```

> ⚠️ Replace `user` and `password` with your **actual** PostgreSQL username and password. The template `postgresql://user:password@...` uses placeholders.

---

## 4. Run migrations

```bash
npx prisma migrate deploy
```

---

## 5. Verify connection

```bash
npx prisma db pull
```

If that succeeds, your connection works.
