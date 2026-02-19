'use client';

interface OfferingsCellProps {
  cuisineType?: string | null;
  tips?: string[] | null;
}

const MAX_TIPS = 5;

/**
 * Offerings cell: cuisine/category + notable items (tips).
 * Price displays in Status cell per directive.
 * Interim solution until full menu parsing (offeringCategories) is implemented.
 */
export function OfferingsCell({
  cuisineType,
  tips,
}: OfferingsCellProps) {
  const hasCuisine = !!cuisineType?.trim();
  const tipList = (tips ?? []).slice(0, MAX_TIPS).filter(Boolean);
  const hasTips = tipList.length > 0;

  if (!hasCuisine && !hasTips) return null;

  return (
    <div className="space-y-4">
      {hasCuisine && (
        <div>
          <h3 className="text-xs uppercase tracking-wider text-[#36454F]/60 mb-2">
            Cuisine
          </h3>
          <p className="text-sm text-[#36454F]/90">{cuisineType}</p>
        </div>
      )}

      {hasTips && (
        <div>
          <h3 className="text-xs uppercase tracking-wider text-[#36454F]/60 mb-2">
            Don&apos;t miss
          </h3>
          <ul className="list-disc list-inside space-y-1 text-sm text-[#36454F]/90">
            {tipList.map((tip, idx) => (
              <li key={idx}>{tip}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
