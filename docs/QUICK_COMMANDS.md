# ⚡ Quick Commands Reference

Copy/paste these commands for common tasks.

---

## 🚀 Start/Stop

```bash
# Start dev server
npm run dev

# Stop dev server
Ctrl+C (or kill the terminal)

# Restart fresh (if issues)
lsof -ti:3000 | xargs kill -9 && npm run dev
```

---

## 👨‍💼 Admin Tools

```bash
# Open Instagram backfill tool
open http://localhost:3000/admin/instagram

# Open review queue
open http://localhost:3000/admin/review

# Open main site
open http://localhost:3000
```

---

## 📊 Quick Stats

```bash
# LA County Instagram coverage
node -e "const{PrismaClient}=require('@prisma/client');const p=new PrismaClient();(async()=>{const t=await p.golden_records.count({where:{county:'Los Angeles',lifecycle_status:'ACTIVE'}});const w=await p.golden_records.count({where:{county:'Los Angeles',lifecycle_status:'ACTIVE',instagram_handle:{not:null}}});console.log('LA:',t,'places,',w,'with IG (',Math.round(w/t*100)+'%)');await p.\$disconnect()})().catch(console.error)"

# Review queue status
node -e "const{PrismaClient}=require('@prisma/client');new PrismaClient().review_queue.count({where:{status:'pending'}}).then(c=>console.log('Pending reviews:',c))"

# Total places
node -e "const{PrismaClient}=require('@prisma/client');new PrismaClient().golden_records.count().then(c=>console.log('Total places:',c))"
```

---

## 📸 Instagram Workflows

```bash
# Export Tier 1/2 places missing Instagram
npm run export:instagram:tier12

# Find handles with AI
npm run find:instagram:tier12

# Merge handles to database
npm run merge:instagram
```

---

## 🧹 Data Cleanup

```bash
# Preview address-named places
npm run clean:addresses -- --dry-run

# Archive address-named places
npm run clean:addresses

# Tag LA County places
npm run tag:la-county
```

---

## 🔄 Data Pipeline

```bash
# Ingest CSV
npm run ingest:csv -- data/myfile.csv my_source_name

# Run entity resolver
npm run resolver:run

# Sync golden → places table
npm run sync:places
```

---

## 💾 Database

```bash
# Push schema changes
npx prisma db push

# Regenerate client
npx prisma generate

# Open Prisma Studio (GUI)
npx prisma studio

# Run query
npx prisma db execute --stdin <<< "SELECT COUNT(*) FROM golden_records"
```

---

## 🔍 Search & Debug

```bash
# Find a place by name
node -e "const{PrismaClient}=require('@prisma/client');new PrismaClient().golden_records.findFirst({where:{name:{contains:'Bestia'}}}).then(p=>console.log(p))"

# Check last 5 places with Instagram
node -e "const{PrismaClient}=require('@prisma/client');new PrismaClient().golden_records.findMany({where:{instagram_handle:{not:null}},orderBy:{updated_at:'desc'},take:5,select:{name:true,instagram_handle:true}}).then(r=>console.table(r))"

# View terminal logs
tail -f .next/server-errors.log
```

---

## 📁 File Locations

```bash
# View session summary
cat SESSION_SUMMARY_2026-02-09.md

# View tomorrow's starter
cat TOMORROW_MORNING_STARTER.md

# List data files
ls -la data/

# List scripts
ls -la scripts/
```

---

## 🐛 Emergency Fixes

```bash
# Clear Next.js cache
rm -rf .next

# Clear node_modules and reinstall
rm -rf node_modules && npm install

# Fix database locks
rm -rf .next/cache/lock .next/dev/lock

# Kill all Node processes (nuclear option)
killall node
```

---

**💡 Tip:** Add this file to your bookmarks for quick access!
