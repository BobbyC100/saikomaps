'use client';

import { useId } from 'react';

interface QuietCardProps {
  variant: 'topo' | 'texture' | 'minimal';
  span?: 2 | 3 | 4 | 6;
  className?: string;
  noMinHeight?: boolean;
}

export function QuietCard({ variant, span = 2, className, noMinHeight = false }: QuietCardProps) {
  const uniqueId = useId();

  return (
    <div
      className={className}
      style={{
        gridColumn: `span ${span}`,
        minHeight: noMinHeight ? 0 : 140,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        width: '100%',
      }}
      aria-hidden="true"
      data-quiet-card={variant}
      data-span={span}
    >
      {variant === 'topo' && <TopoPattern id={uniqueId} />}
      {variant === 'texture' && <TexturePattern id={uniqueId} />}
      {variant === 'minimal' && <MinimalPattern />}
    </div>
  );
}

function TopoPattern({ id }: { id: string }) {
  const patternId = `topo-${id}`;
  return (
    <svg
      width="100%"
      height="100%"
      style={{ position: 'absolute', top: 0, left: 0, opacity: 0.15 }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern id={patternId} x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
          <ellipse
            cx="40"
            cy="40"
            rx="35"
            ry="30"
            fill="none"
            stroke="#C3B091"
            strokeWidth="0.5"
          />
          <ellipse
            cx="40"
            cy="40"
            rx="25"
            ry="20"
            fill="none"
            stroke="#C3B091"
            strokeWidth="0.5"
          />
          <ellipse
            cx="40"
            cy="40"
            rx="15"
            ry="10"
            fill="none"
            stroke="#C3B091"
            strokeWidth="0.5"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${patternId})`} />
    </svg>
  );
}

function TexturePattern({ id }: { id: string }) {
  const patternId = `texture-${id}`;
  return (
    <svg
      width="100%"
      height="100%"
      style={{ position: 'absolute', top: 0, left: 0, opacity: 0.15 }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern id={patternId} x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
          <line x1="0" y1="20" x2="40" y2="20" stroke="#C3B091" strokeWidth="1" />
          <line x1="20" y1="0" x2="20" y2="40" stroke="#C3B091" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${patternId})`} />
    </svg>
  );
}

function MinimalPattern() {
  return (
    <div
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 32,
        height: 32,
        borderRadius: '50%',
        border: '1px solid rgba(195, 176, 145, 0.15)',
      }}
    />
  );
}
