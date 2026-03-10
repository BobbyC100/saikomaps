# Tier 3 Bento Row Implementation — Complete

## Summary
Implemented the Tier 3 bento row with Hours, Map, and Call cards according to the Field Notes design spec (Option B).

## Files Modified

### 1. `/app/(viewer)/place/[slug]/page.tsx`
- Created new Tier 3 row container grouping Hours, Map, and Call cards
- Updated Hours card to use two-column layout (M-Th | F-Su)
- Added status footer to Hours card showing "Open · Closes 11 PM" or "Closed · Opens 5 PM"
- Updated Map card with new styling: label at top, simplified tile, address below, no "View on map" link
- Updated Call card with new styling: label at top, centered icon + number
- Improved `parseHours()` function to extract both close and open times
- Added graceful degradation logic with conditional CSS classes

### 2. `/app/(viewer)/place/[slug]/place.module.css`
- Added `.tier3Row` grid container with 1.2fr 1fr 0.8fr columns
- Updated `.hoursBlock` and `.hoursGrid` for two-column layout
- Added `.hoursStatusFooter`, `.hoursStatusDot`, `.hoursStatusText` for status display
- Created new `.mapCard`, `.mapCardLabel`, `.mapTileStyled` (simplified)
- Added `.mapPinDot` for red pin marker with white border
- Created `.callCard`, `.callCardLabel`, `.callCardContent`, `.callCardIcon`, `.callCardNumber`
- Added graceful degradation classes: `.noHours`, `.noPhone`, `.onlyMap`
- Updated mobile responsiveness for stacking and horizontal call card layout

## Features Implemented

### Layout
✅ Three cards in single row: Hours (1.2fr), Map (1fr), Call (0.8fr)  
✅ All cards stretch to equal height  
✅ 12px gap between cards  
✅ Field Notes color palette (#FFFDF7 cards on #F5F0E1 background)

### Hours Card
✅ "HOURS" label with khaki uppercase styling  
✅ Two-column grid: weekdays left, weekend right  
✅ M/T/W/Th in column 1, F/S/Su in column 2  
✅ Today's row bold with opacity: 1  
✅ Status footer with dot + text (green when open, muted when closed)  
✅ Shows "Open · Closes 11 PM" or "Closed · Opens 5 PM"

### Map Card
✅ "MAP" label with khaki uppercase styling  
✅ Styled map tile with grid background and road lines  
✅ Red pin dot (14×14px) with white border and shadow  
✅ Street address (bold serif) + city/state (muted serif) centered below  
✅ No "View on map" link (cleaner design)  
✅ Entire card is clickable → opens Google Maps directions

### Call Card
✅ "CALL" label with khaki uppercase styling  
✅ 40×40px phone icon centered  
✅ Phone number in Libre Baskerville serif  
✅ Entire card is clickable → triggers tel: link

### Graceful Degradation
✅ No hours → Grid: 1fr 0.8fr (Map + Call)  
✅ No phone → Grid: 1.2fr 1fr (Hours + Map)  
✅ No hours + no phone → Map full-width  
✅ Cards don't render if data is missing

### Mobile Responsive (< 640px)
✅ Tier 3 row stacks vertically  
✅ Hours card keeps two-column layout internally  
✅ Map tile gets min-height: 120px  
✅ Call card becomes horizontal (icon left, number right)

## Color Reference
- Card background: `#FFFDF7`
- Page background: `#F5F0E1`
- Label text: `#C3B091` (khaki)
- Body text: `#36454F` (charcoal)
- Open status: `#4A7C59` (sage green)
- Closed status: `#36454F` at 40% opacity
- Pin red: `#D64541` (coral)

## Testing Checklist
- [x] No linter errors
- [ ] Test with full hours data
- [ ] Test with partial hours data (openNow only)
- [ ] Test with no hours data (card hidden)
- [ ] Test with no phone (call card hidden)
- [ ] Test with no address (address hidden but tile shows)
- [ ] Test mobile layout (< 640px)
- [ ] Test Map card click → opens Google Maps
- [ ] Test Call card click → triggers phone call
- [ ] Test "Open/Closed" status with real hours data
- [ ] Test close/open time extraction

## Next Steps
1. Test on actual merchant pages with real data
2. Verify status footer logic with timezone-aware hours
3. Consider adding static map image URL support (Google Maps Static API)
4. Test cross-browser compatibility (Safari, Firefox, Chrome)
