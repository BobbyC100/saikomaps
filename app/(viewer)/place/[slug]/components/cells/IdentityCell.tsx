'use client';

interface IdentityCellProps {
  name: string;
  category: string | null;
  tagline?: string | null;
  description?: string | null;
}

export function IdentityCell({ name, category, tagline, description }: IdentityCellProps) {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-[#36454F] tracking-tight">{name}</h1>
      {category && (
        <p className="text-sm text-[#36454F]/70 mt-0.5">{category}</p>
      )}
      {tagline && (
        <p className="text-[#8B7355] italic mt-2">{tagline}</p>
      )}
      {description && (
        <p className="text-sm text-[#36454F]/80 mt-2 line-clamp-3">{description}</p>
      )}
    </div>
  );
}
