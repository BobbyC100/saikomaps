/**
 * One-off: call Legacy Place Details for a place_id and log opening_hours.
 * Use: node -r ./scripts/load-env.js ./node_modules/.bin/tsx scripts/probe-legacy-hours.ts [placeId]
 */
import { getPlaceDetails } from '@/lib/google-places';

async function main() {
  const placeId = process.argv[2] ?? 'ChIJ5Zhalc6kwoARm4tOh2YqVZ8';

  const details = await getPlaceDetails(placeId);
  if (!details) {
    console.log('Legacy getPlaceDetails returned null (NOT_FOUND)');
    console.log('Legacy has hours: no');
    return;
  }

  const oh = details.openingHours;
  const hasOh = !!oh;
  const weekdayText = oh?.weekdayText;
  const hasWeekdayText = Array.isArray(weekdayText) && weekdayText.length > 0;

  console.log('--- Legacy Place Details (opening_hours) ---');
  console.log('opening_hours present:', hasOh);
  if (oh) {
    console.log('opening_hours.openNow:', oh.openNow);
    console.log('opening_hours.weekdayText:', JSON.stringify(weekdayText, null, 2));
  } else {
    console.log('opening_hours.weekday_text: (not present)');
  }
  console.log('');
  console.log('Legacy has hours:', hasWeekdayText ? 'yes' : 'no');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
