/**
 * Tier 1.5 - Instagram Confidence Row
 * CRITICAL: Slim, single-line treatment
 * Must NOT compete with primary actions
 */

interface InstagramConfidenceRowProps {
  handle: string;
}

export function InstagramConfidenceRow({ handle }: InstagramConfidenceRowProps) {
  // Guard: only render if handle is valid
  if (!handle || handle.trim().length === 0) {
    return null;
  }

  const instagramUrl = `https://instagram.com/${handle.replace('@', '')}`;

  return (
    <a
      href={instagramUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="instagram-row"
      aria-label={`View ${handle} on Instagram`}
    >
      <span className="instagram-icon">📸</span>
      <span className="instagram-handle">@{handle.replace('@', '')}</span>
      <span className="instagram-chevron">→</span>
    </a>
  );
}
