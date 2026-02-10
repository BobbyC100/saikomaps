/**
 * Proximity Badge - Distance indicator with severity
 */

'use client';

interface ProximityBadgeProps {
  distanceMeters: number;
}

export function ProximityBadge({ distanceMeters }: ProximityBadgeProps) {
  let label: string;
  let className: string;
  
  if (distanceMeters < 20) {
    label = `${Math.round(distanceMeters)}m — Likely same storefront`;
    className = 'bg-green-100 text-green-800 border-green-200';
  } else if (distanceMeters < 50) {
    label = `${Math.round(distanceMeters)}m — Same block`;
    className = 'bg-green-50 text-green-700 border-green-100';
  } else if (distanceMeters < 100) {
    label = `${Math.round(distanceMeters)}m — Nearby`;
    className = 'bg-yellow-50 text-yellow-700 border-yellow-200';
  } else {
    label = `${Math.round(distanceMeters)}m — ⚠ Different blocks`;
    className = 'bg-red-50 text-red-700 border-red-200';
  }
  
  return (
    <span className={`text-xs uppercase tracking-wider px-3 py-1 rounded border font-semibold ${className}`}>
      {label}
    </span>
  );
}
