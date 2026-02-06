'use client';

const SECTIONS = [
  { id: 'places', label: 'Places' },
  { id: 'title', num: 2, label: 'Title' },
  { id: 'details', num: 3, label: 'Details' },
] as const;

interface FloatingMiniNavProps {
  placeCount: number;
}

export default function FloatingMiniNav({ placeCount }: FloatingMiniNavProps) {
  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <nav
      className="fixed top-[74px] right-5 z-[100] flex items-center gap-2 px-3 py-2 rounded-full"
      style={{
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
      }}
    >
      <span
        className="px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
        style={{ backgroundColor: '#D4785C' }}
      >
        {placeCount}
      </span>
      <button
        type="button"
        onClick={() => scrollToSection('title')}
        className="text-sm font-medium text-[#2D2D2D] hover:text-[#D4785C] transition-colors"
      >
        Title
      </button>
      <button
        type="button"
        onClick={() => scrollToSection('details')}
        className="text-sm font-medium text-[#2D2D2D] hover:text-[#D4785C] transition-colors"
      >
        Details
      </button>
    </nav>
  );
}
