/**
 * Tier 1 - Vibe Tags Row
 * Optional editorial tags
 */

interface VibeTagsRowProps {
  tags: string[];
}

export function VibeTagsRow({ tags }: VibeTagsRowProps) {
  // Guard: only render if tags exist
  if (!tags || tags.length === 0) {
    return null;
  }

  return (
    <div className="vibe-tags">
      {tags.map((tag, index) => (
        <span key={index} className="vibe-tag">
          {tag}
        </span>
      ))}
    </div>
  );
}
