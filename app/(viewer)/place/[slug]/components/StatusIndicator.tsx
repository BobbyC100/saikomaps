'use client';

interface StatusIndicatorProps {
  isOpen: boolean | null;
  statusText: string | null;
}

export function StatusIndicator({ isOpen, statusText }: StatusIndicatorProps) {
  if (!statusText) return null;

  return (
    <div className="flex items-center gap-2">
      <span
        className="w-2 h-2 rounded-full shrink-0"
        style={{
          background: isOpen ? '#4A7C59' : '#36454F',
          opacity: isOpen ? 1 : 0.5,
        }}
      />
      <span
        className="text-sm"
        style={{
          color: isOpen ? '#4A7C59' : '#36454F',
          opacity: isOpen ? 1 : 0.5,
        }}
      >
        {statusText}
      </span>
    </div>
  );
}
