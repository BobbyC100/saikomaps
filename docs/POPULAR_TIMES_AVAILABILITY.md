# popular_times Availability

**Status: NOT available from Google Places API**

The `popular_times` data (hourly/daily footfall estimates) is **not** exposed by the official Google Places API. It was briefly available years ago via unofficial means and was subsequently removed. Google has never re-exposed it in the public API.

## Impact

- `golden_records.google_places_attributes` stores `popular_times: null` with `_meta.popular_times_available: false`
- Coverage census `golden_records_with_popular_times` will remain 0 for records backfilled via our pipeline
- Energy/tag scoring cannot use popular_times as a signal from our current ingestion source

## Alternatives (if needed later)

- **Third-party aggregators**: Some vendors scrape or estimate footfall; cost and data quality vary
- **First-party analytics**: If we ever integrate with venue POS or reservation systems
- **Model-based inference**: Use opening hours, category, and other signals to approximate busy periods (no ground truth)

## Reference

- [Google Places API (Legacy) fields](https://developers.google.com/maps/documentation/places/web-service/details#fields) — no `popular_times`
- Historical: popular_times was removed from public access ~2017–2018
