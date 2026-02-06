# CSV Upload - Manual Test Guide

## Test: CSV upload opens file picker

1. **Start the app**: `npm run dev`
2. **Navigate**: Go to http://localhost:3000, sign in if needed
3. **Open editor**: Create a new map or open an existing one at `/maps/{id}/edit`
4. **Open Add Location modal**: Click "+ Add Place" in the Places section
5. **Scroll down** to the "Upload CSV" section (below the link and search inputs)
6. **Click the "Choose CSV file" button** (coral/orange button)
7. **Expected**: File picker dialog opens to select a .csv file

## Alternative: Drag & drop

- You can also **drag a .csv file** onto the dashed box to upload

## Implementation details

- **Explicit button**: "Choose CSV file" button triggers the hidden file input via `inputRef.current.click()`
- This pattern works reliably across browsers (Chrome, Firefox, Safari, Edge)
- Drag & drop is handled separately on the dashed zone div
