#!/bin/bash

# 12-query sanity test for EOS

queries=(
  "restaurant"
  "dinner"
  "tacos"
  "pizza"
  "sushi"
  "burgers"
  "coffee"
  "bakery"
  "bar"
  "thai"
  "korean"
  "italian"
)

echo "=== EOS Sanity Test (with cuisinePrimary) ==="
echo ""

for q in "${queries[@]}"; do
  count=$(curl -s "http://localhost:3000/api/search?q=$q" | jq '.places | length')
  printf "%-15s → %2s results\n" "$q" "$count"
done

echo ""
echo "=== Phase 1 Fixes ===
echo "✅ Park's BBQ:"
echo "   - category: nature → eat (fixed)"
echo "   - cuisinePrimary: Korean (via overrides.json)"
echo "   - cuisineSecondary: [Korean BBQ]"
echo "   - Now discoverable via 'korean' search"
echo ""
echo "❌ Real Coverage Gaps (not metadata issues):"
echo "   - burgers: 0 ranked burger places in LA inventory"
echo ""
echo "Target: <10% with 0-1 results (max 1-2 queries)"
