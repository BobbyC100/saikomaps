#!/bin/bash

# Saiko Maps Homepage Integration Test
# Run this to verify the homepage setup

echo "🎨 Saiko Maps Homepage Integration Test"
echo "========================================"
echo ""

# Check if files exist
echo "✓ Checking component files..."
files=(
  "components/homepage/Hero.tsx"
  "components/homepage/Hero.module.css"
  "components/homepage/SectionHeader.tsx"
  "components/homepage/SectionHeader.module.css"
  "components/homepage/NeighborhoodCard.tsx"
  "components/homepage/NeighborhoodCard.module.css"
  "components/homepage/CategoryCard.tsx"
  "components/homepage/CategoryCard.module.css"
  "components/homepage/HomepageFooter.tsx"
  "components/homepage/HomepageFooter.module.css"
  "components/homepage/index.ts"
  "app/page.tsx"
  "app/homepage.module.css"
  "public/kurt-watercolor-map.png"
)

all_exist=true
for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "  ✓ $file"
  else
    echo "  ✗ $file (MISSING)"
    all_exist=false
  fi
done

echo ""

# Check for Inter Tight font in globals.css
echo "✓ Checking global styles..."
if grep -q "Inter+Tight" app/globals.css; then
  echo "  ✓ Inter Tight font imported"
else
  echo "  ✗ Inter Tight font not found"
  all_exist=false
fi

if grep -q "parchment" app/globals.css; then
  echo "  ✓ Homepage color palette defined"
else
  echo "  ✗ Homepage color palette not found"
  all_exist=false
fi

echo ""

# Final result
if [ "$all_exist" = true ]; then
  echo "✅ All files in place!"
  echo ""
  echo "Next steps:"
  echo "1. Run 'npm run dev' to start the dev server"
  echo "2. Visit http://localhost:3000"
  echo "3. You should see the watercolor map homepage"
  echo ""
else
  echo "❌ Some files are missing. Please review the integration."
fi
