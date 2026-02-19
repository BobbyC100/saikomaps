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
  curatorNote?: string | null;
  thematicTags?: string[] | null;
  contextualConnection?: string | null;
  curatorAttribution?: string | null;
}

const EXCERPT_MAX = 250;

function getExcerpt(source: EditorialSource): string {
  const text = source.excerpt ?? source.content ?? '';
  if (text.length <= EXCERPT_MAX) return text;
  return text.slice(0, EXCERPT_MAX).trim() + '…';
}

/**
 * Editorial cell: primary note, attribution, thematic tags, contextual connection.
 * Primary content: sources[0].excerpt if available, else curatorNote.
 */
export function EditorialCell({
  sources,
  curatorNote,
  thematicTags,
  contextualConnection,
  curatorAttribution,
}: EditorialCellProps) {
  const list = sources ?? [];
  const first = list[0];
  const excerptFromSource = first ? getExcerpt(first) : null;
  const editorialNote = excerptFromSource ?? curatorNote?.trim() ?? null;
  const sourceAttribution = first?.publication ?? first?.name ?? null;
  const tagList = (thematicTags ?? []).filter(Boolean);
  const hasTags = tagList.length > 0;
  const hasContext = !!contextualConnection?.trim();
  const hasCuratorByline = !!curatorAttribution?.trim();

  const hasContent =
    editorialNote || hasTags || hasContext || hasCuratorByline;

  if (!hasContent) return null;

  return (
    <div className="space-y-3">
      {/* Primary editorial content */}
      {editorialNote && (
        <div>
          <p className="text-sm text-[#36454F]/90 mb-1">{editorialNote}</p>
          {excerptFromSource && first?.url && (
            <a
              href={first.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-[#C3B091] hover:underline"
            >
              Read on {sourceAttribution ?? 'Source'} →
            </a>
          )}
        </div>
      )}

      {/* Thematic tags */}
      {hasTags && (
        <div className="flex flex-wrap gap-2">
          {tagList.map((tag, idx) => (
            <span
              key={idx}
              className="text-xs px-2 py-0.5 rounded-full bg-[#C3B091]/20 text-[#36454F]/90"
            >
              #{tag.replace(/\s+/g, '-').toLowerCase()}
            </span>
          ))}
        </div>
      )}

      {/* Contextual connection */}
      {hasContext && (
        <p className="text-sm italic text-[#36454F]/70">
          {contextualConnection}
        </p>
      )}

      {/* Curator attribution byline */}
      {hasCuratorByline && (
        <p className="text-xs text-[#36454F]/60">— {curatorAttribution}</p>
      )}
    </div>
  );
}
