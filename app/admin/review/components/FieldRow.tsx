/**
 * Field Row - Single field comparison with diff highlighting
 */

'use client';

interface FieldRowProps {
  label: string;
  valA: string | null | undefined;
  valB: string | null | undefined;
  prioritySource: 'editorial' | 'google' | 'foursquare';
  sourceA: string;
  sourceB: string;
}

// Simple client-side similarity check (Levenshtein-based)
function simpleSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 1;
  if (!str1 || !str2) return 0;
  
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1;
  
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(str1: string, str2: string): number {
  const track = Array(str2.length + 1).fill(null).map(() =>
    Array(str1.length + 1).fill(null));
  for (let i = 0; i <= str1.length; i += 1) {
    track[0][i] = i;
  }
  for (let j = 0; j <= str2.length; j += 1) {
    track[j][0] = j;
  }
  for (let j = 1; j <= str2.length; j += 1) {
    for (let i = 1; i <= str1.length; i += 1) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      track[j][i] = Math.min(
        track[j][i - 1] + 1,
        track[j - 1][i] + 1,
        track[j - 1][i - 1] + indicator,
      );
    }
  }
  return track[str2.length][str1.length];
}

export function FieldRow({ label, valA, valB, prioritySource, sourceA, sourceB }: FieldRowProps) {
  const similarity = simpleSimilarity(valA || "", valB || "");
  const isMatch = similarity > 0.95;
  const isConflict = similarity < 0.80 && valA && valB;
  const isSimilar = !isMatch && !isConflict && valA && valB;
  
  // Determine which side wins based on priority source
  const aWins = (prioritySource === 'editorial' && sourceA.includes('editorial')) ||
                (prioritySource === 'google' && sourceA.includes('google'));

  return (
    <div className={`
      grid grid-cols-2 gap-6 py-4 px-6
      ${isConflict ? 'bg-red-50' : ''}
      ${isSimilar ? 'bg-yellow-50' : ''}
    `}>
      {/* Record A */}
      <div className="relative">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold">
            {label}
          </span>
          {aWins && <span className="text-green-600">★</span>}
        </div>
        <p className={`
          text-sm
          ${isMatch ? 'text-gray-600' : ''}
          ${isConflict ? 'text-red-700 font-semibold' : ''}
          ${isSimilar ? 'text-yellow-800' : ''}
          ${!valA ? 'text-gray-300 italic' : ''}
        `}>
          {valA || '—'}
        </p>
      </div>
      
      {/* Record B */}
      <div className="relative border-l border-gray-200 pl-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold">
            {label}
          </span>
          {!aWins && <span className="text-green-600">★</span>}
        </div>
        <p className={`
          text-sm
          ${isMatch ? 'text-gray-600' : ''}
          ${isConflict ? 'text-red-700 font-semibold' : ''}
          ${isSimilar ? 'text-yellow-800' : ''}
          ${!valB ? 'text-gray-300 italic' : ''}
        `}>
          {valB || '—'}
        </p>
      </div>
    </div>
  );
}
