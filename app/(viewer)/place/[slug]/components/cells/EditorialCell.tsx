'use client';

interface EditorialSource {
  url: string;
  publication?: string;
  name?: string;
  excerpt?: string;
  content?: string;
}

interface EditorialCellProps {
  sources?: EditorialSource[] | null;
}

const EXCERPT_MAX = 250;

function getExcerpt(source: EditorialSource): string {
  const text = source.excerpt ?? source.content ?? '';
  if (text.length <= EXCERPT_MAX) return text;
  return text.slice(0, EXCERPT_MAX).trim() + '…';
}

export function EditorialCell({ sources }: EditorialCellProps) {
  const list = sources ?? [];
  const first = list[0];
  if (!first || !first.url) return null;

  const excerpt = getExcerpt(first);
  if (!excerpt) return null;

  const publication = first.publication ?? first.name ?? 'Source';

  return (
    <div>
      <p className="text-sm text-[#36454F]/90 mb-2">{excerpt}</p>
      <a
        href={first.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-[#C3B091] hover:underline"
      >
        Read on {publication} →
      </a>
    </div>
  );
}
