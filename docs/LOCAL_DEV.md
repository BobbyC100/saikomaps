# Local Development

Saiko runs on Next.js + Prisma. Single data path, no branching.

---

## Setup

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Add your DATABASE_URL
```

---

## Database

### Migrate

```bash
npx prisma migrate dev
```

### Seed

Populates database with test scenarios A, B, C:

```bash
npm run seed
```

### Reset

```bash
npx prisma migrate reset
```

### Studio

```bash
npx prisma studio
```

---

## Run

```bash
npm run dev
```

Visit:
- `/demo` — All 3 scenarios side-by-side
- `/place/scenario-a` — Fully curated
- `/place/scenario-b` — Editorial lite  
- `/place/scenario-c` — Baseline

---

## Environment Variables

```
DATABASE_URL=postgresql://user:pass@localhost:5432/saikomaps
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_key
```

---

## Commands

```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run type-check   # TypeScript check
npm run seed         # Seed database
npx prisma studio    # Database GUI
```

---

## Merchant Page Testing

After seeding, test the tier hierarchy:

1. Visit `/place/scenario-a`
2. Open merchant-page-implementation-checklist.md
3. Verify all 11 sections pass
4. Check tier order (1-12)
5. Confirm HoursCard always renders
6. Verify hero excluded from collage

---

*That's it. No deployment docs, no multi-db branching.*
