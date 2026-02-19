'use client';

interface OfferingsCellProps {
  cuisineType?: string | null;
  tips?: string[] | null;
  priceLevel?: number | null;
}

const MAX_TIPS = 5;

export function OfferingsCell({
  cuisineType,
  tips,
  priceLevel,
}: OfferingsCellProps) {
  const hasCuisine = !!cuisineType?.trim();
  const tipList = (tips ?? []).slice(0, MAX_TIPS).filter(Boolean);
  const hasTips = tipList.length > 0;
  const priceSymbol = priceLevel
    ? '$'.repeat(Math.min(priceLevel, 4))
    : null;

  if (!hasCuisine && !hasTips && !priceSymbol) return null;

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

      {priceSymbol && (
        <p className="text-sm text-[#36454F]/70">{priceSymbol}</p>
      )}
    </div>
  );
}
