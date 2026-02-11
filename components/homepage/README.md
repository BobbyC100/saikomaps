# Homepage Components

Clean, editorial homepage for Saiko Maps featuring a watercolor illustrated map hero.

## Components

### `Hero`
Hero section with watercolor map background, brand name, location, and CTA button.
- Uses `/public/kurt-watercolor-map.png` as background
- Features Libre Baskerville italic typography for brand
- Inter Tight for location and CTA

### `SectionHeader`
Reusable section header with title and "See all" link.
- Props: `title`, `linkText`, `linkHref`

### `NeighborhoodCard`
Card component for neighborhood listings with image overlay.
- Props: `name`, `count`, `imageUrl`, `href`
- Hover effect: scales image
- 4:3 aspect ratio

### `CategoryCard`
Card component for category listings with image and description.
- Props: `title`, `description`, `count`, `imageUrl`, `href`
- Hover effect: lifts card with shadow
- 16:10 aspect ratio for image

### `HomepageFooter`
Footer with branding, tagline, and navigation links.
- Charcoal background
- Libre Baskerville italic tagline

## Color Palette

Defined in `globals.css`:
- `--parchment`: #F5F0E1
- `--warm-white`: #FFFDF7
- `--charcoal`: #36454F
- `--khaki`: #C3B091
- `--leather`: #8B7355

## Typography

- **Brand/Titles**: Libre Baskerville (italic) - already in layout
- **UI Text**: Inter Tight (imported in globals.css)

## Grid System

- **Neighborhoods**: 4 columns → 2 cols @ 1000px → 1 col @ 600px
- **Categories**: 4 columns → 2 cols @ 1000px → 1 col @ 600px

## Usage

The homepage is at `/app/page.tsx` and imports all components from `@/components/homepage`.

To update neighborhood or category data, edit the arrays in `/app/page.tsx`.
