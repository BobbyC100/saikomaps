'use client';

interface SectionDividerProps {
  label: string; // e.g. "10 Places"
}

export function SectionDivider({ label }: SectionDividerProps) {
  return (
    <div
      className="col-span-2 md:col-span-4 lg:col-span-6 flex items-center gap-4 py-2.5"
    >
      <div
        className="flex-1 h-px"
        style={{ backgroundColor: 'rgba(195,176,145,0.25)' }}
      />
      <span
        className="text-[9px] uppercase tracking-[0.2em] whitespace-nowrap"
        style={{ color: 'var(--fn-khaki)' }}
      >
        {label}
      </span>
      <div
        className="flex-1 h-px"
        style={{ backgroundColor: 'rgba(195,176,145,0.25)' }}
      />
    </div>
  );
}
