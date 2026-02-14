# Saiko Maps — Project Structure

```
saikomaps/
│
├── 📄 README.md                           # Project overview
├── 📄 COMPLETION-SUMMARY.md               # Implementation summary
├── 📄 IMPLEMENTATION.md                   # Developer guide
├── 📄 QUICK-REFERENCE.md                  # Quick reference (one-page)
├── 📄 PR-REVIEW-REPORT.md                 # Example PR review
├── 📄 merchant-page-implementation-checklist.md  # PR checklist (v2.2)
├── 📄 saiko-merchant-data-hierarchy.md    # Data hierarchy spec
│
├── 📦 package.json                        # Dependencies
├── 📦 tsconfig.json                       # TypeScript config
├── 📦 next.config.js                      # Next.js config
├── 📦 tailwind.config.js                  # Tailwind config
├── 📦 postcss.config.js                   # PostCSS config
├── 📦 .eslintrc.json                      # ESLint config
├── 📦 .gitignore                          # Git ignore rules
├── 📦 .env.example                        # Environment variables template
│
├── 📁 .github/
│   └── PULL_REQUEST_TEMPLATE.md           # PR template with checklist
│
├── 📁 .cursor/
│   └── rules/
│       └── merchant-page-review.mdc       # Cursor enforcement rule
│
├── 📁 app/
│   ├── layout.tsx                         # Root layout
│   ├── globals.css                        # Global styles
│   │
│   ├── place/
│   │   └── [slug]/
│   │       └── page.tsx                   # Merchant profile route (/place/[slug])
│   │
│   └── demo/
│       └── page.tsx                       # Test scenarios page (/demo)
│
├── 📁 components/
│   └── merchant/
│       ├── index.ts                       # Barrel export (clean imports)
│       ├── MerchantPage.tsx              # 🔒 Main assembly (tier order)
│       │
│       ├── HeroHeader.tsx                # Tier 0: Identity
│       ├── PrimaryActionSet.tsx          # Tier 0: Actions
│       ├── InstagramConfidenceRow.tsx    # Tier 1.5: Slim treatment
│       ├── PhotoCollage.tsx              # Tier 1: Visual (hero excluded)
│       ├── VibeTagsRow.tsx               # Tier 1: Editorial tags
│       ├── TrustBlock.tsx                # Tier 2: Editorial + Context
│       ├── HoursCard.tsx                 # Tier 3: ALWAYS RENDERS ⚠️
│       ├── AddressCard.tsx               # Tier 3: Facts
│       ├── MapTile.tsx                   # Tier 3: Reference-only
│       ├── AttributesCard.tsx            # Tier 4: Chip compression
│       ├── AlsoOnLists.tsx               # Tier 5: Discovery
│       └── HouseCard.tsx                 # Tier 5: Editorial closure
│
└── 📁 lib/
    ├── types/
    │   └── merchant.ts                   # TypeScript type definitions
    │
    └── mock-data.ts                      # Test data (Scenarios A, B, C)
```

---

## Key Files

### Must-Read Documents
1. **merchant-page-implementation-checklist.md** — PR review checklist (11 sections)
2. **QUICK-REFERENCE.md** — One-page developer reference
3. **IMPLEMENTATION.md** — Full developer guide

### Critical Components
1. **MerchantPage.tsx** — Main assembly with locked tier order
2. **HoursCard.tsx** — ALWAYS renders (even with missing data)
3. **InstagramConfidenceRow.tsx** — Slim treatment (not button weight)
4. **PhotoCollage.tsx** — Hero photo exclusion logic
5. **AttributesCard.tsx** — Chip compression (max 6 visible)

### Testing
1. **lib/mock-data.ts** — Scenarios A, B, C
2. **app/demo/page.tsx** — Visual testing page

### Enforcement
1. **.cursor/rules/merchant-page-review.mdc** — Auto-activates in merchant components

---

## File Count

| Category | Count |
|----------|-------|
| Components (TSX) | 13 |
| Routes (TSX) | 3 |
| Types & Data (TS) | 2 |
| Styles (CSS) | 1 |
| Config (JS/JSON) | 6 |
| Documentation (MD) | 7 |
| Cursor Rule (MDC) | 1 |
| Templates | 2 |
| **Total** | **35 files** |

---

*See COMPLETION-SUMMARY.md for full details*
