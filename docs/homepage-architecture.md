# Homepage Component Architecture

## File Structure

```
saiko-maps/
├── app/
│   ├── page.tsx                    # Homepage (NEW)
│   ├── homepage.module.css         # Homepage layout styles (NEW)
│   ├── globals.css                 # Updated with Inter Tight + colors
│   └── layout.tsx                  # Root layout (unchanged)
│
├── components/
│   └── homepage/                   # NEW directory
│       ├── Hero.tsx
│       ├── Hero.module.css
│       ├── SectionHeader.tsx
│       ├── SectionHeader.module.css
│       ├── NeighborhoodCard.tsx
│       ├── NeighborhoodCard.module.css
│       ├── CategoryCard.tsx
│       ├── CategoryCard.module.css
│       ├── HomepageFooter.tsx
│       ├── HomepageFooter.module.css
│       ├── index.ts
│       └── README.md
│
├── public/
│   └── kurt-watercolor-map.png    # NEW - Hero background
│
└── docs/
    └── homepage-design-spec.md     # NEW - Original design spec
```

## Component Hierarchy

```
/app/page.tsx (Homepage)
│
├─ <Hero />
│  ├─ Watercolor map background
│  ├─ Brand name ("Saiko Maps")
│  ├─ Location ("Los Angeles")
│  ├─ CTA button ("Explore")
│  └─ Scroll hint chevron
│
├─ Neighborhoods Section
│  ├─ <SectionHeader title="BY NEIGHBORHOOD" />
│  └─ Grid
│     ├─ <NeighborhoodCard name="Echo Park" />
│     ├─ <NeighborhoodCard name="Highland Park" />
│     ├─ <NeighborhoodCard name="Koreatown" />
│     └─ <NeighborhoodCard name="San Gabriel Valley" />
│
├─ Categories Section
│  ├─ <SectionHeader title="BY CATEGORY" />
│  └─ Grid
│     ├─ <CategoryCard title="Wine" />
│     ├─ <CategoryCard title="Coffee" />
│     ├─ <CategoryCard title="Cheese Shops" />
│     └─ <CategoryCard title="Late Night" />
│
└─ <HomepageFooter />
   ├─ Branding ("SAIKO")
   ├─ Tagline
   └─ Navigation links
```

## Props Interface Reference

### Hero
No props - all content is hardcoded

### SectionHeader
```typescript
interface SectionHeaderProps {
  title: string        // e.g., "BY NEIGHBORHOOD"
  linkText: string     // e.g., "See all"
  linkHref: string     // e.g., "/explore?filter=neighborhoods"
}
```

### NeighborhoodCard
```typescript
interface NeighborhoodCardProps {
  name: string         // e.g., "Echo Park"
  count: number        // e.g., 31
  imageUrl: string     // Unsplash or local image URL
  href: string         // e.g., "/explore?neighborhood=echo-park"
}
```

### CategoryCard
```typescript
interface CategoryCardProps {
  title: string        // e.g., "Wine"
  description: string  // e.g., "Natural pours and neighborhood gems"
  count: number        // e.g., 19
  imageUrl: string     // Unsplash or local image URL
  href: string         // e.g., "/explore?category=wine"
}
```

### HomepageFooter
No props - all content is hardcoded

## Styling Approach

- **CSS Modules**: Each component has its own scoped stylesheet
- **CSS Custom Properties**: Colors defined in `:root` (globals.css)
- **Responsive Grid**: CSS Grid with media queries
- **No Tailwind**: Homepage uses pure CSS for editorial feel

## Integration with Existing App

The new homepage is completely standalone and doesn't interfere with:
- Your existing `/explore`, `/map/*`, `/admin/*` routes
- Your existing components in `/components/*`
- Your Tailwind-based pages and components
- Your existing color system and design tokens

Both design systems coexist:
- **Homepage**: Editorial, watercolor, Libre Baskerville
- **App**: Clean, modern, DM Sans + Tailwind
