'use client';

interface SkateLayerToggleProps {
  on: boolean;
  onChange: (on: boolean) => void;
}

export function SkateLayerToggle({ on: isOn, onChange }: SkateLayerToggleProps) {
  return (
    <button
      type="button"
      onClick={() => onChange(!isOn)}
      className={`
        flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium
        transition-colors border
        ${isOn
          ? 'bg-[#3D5A80] text-white border-[#3D5A80]'
          : 'bg-white/90 text-gray-600 border-gray-300 hover:border-gray-400'
        }
      `}
      aria-pressed={isOn}
      aria-label={isOn ? 'Hide skate spots' : 'Show skate spots'}
    >
      <span className="w-4 h-4 flex items-center justify-center">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
          <ellipse cx="12" cy="12" rx="6" ry="2.5" />
          <line x1="6" y1="12" x2="18" y2="12" />
        </svg>
      </span>
      Skate
    </button>
  );
}
