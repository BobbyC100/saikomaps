/**
 * Tier 2 - Trust Block
 * Editorial layer: curator note + coverage
 * CRITICAL: Fully collapses if no content
 */

import { CuratorNote, CoverageSource } from '@/lib/types/merchant';

interface TrustBlockProps {
  curatorNote?: CuratorNote;
  coverageSources?: CoverageSource[];
}

export function TrustBlock({ curatorNote, coverageSources }: TrustBlockProps) {
  const hasCurator = curatorNote && curatorNote.text.trim().length > 0;
  const hasCoverage = coverageSources && coverageSources.length > 0;

  // Guard: only render if we have curator note OR coverage
  if (!hasCurator && !hasCoverage) {
    return null;
  }

  return (
    <div className="trust-block">
      {/* Curator note renders first if present */}
      {hasCurator && (
        <div className="curator-note">
          <p className="curator-text">{curatorNote.text}</p>
          {curatorNote.author && (
            <p className="curator-author">— {curatorNote.author}</p>
          )}
        </div>
      )}

      {/* Coverage can render without curator note */}
      {hasCoverage && (
        <div className="coverage-sources">
          <h3 className="coverage-heading">Featured In</h3>
          <ul className="coverage-list">
            {coverageSources.map((source, index) => (
              <li key={index} className="coverage-item">
                {source.url ? (
                  <a 
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="coverage-link"
                  >
                    {source.publication}
                  </a>
                ) : (
                  <span className="coverage-text">{source.publication}</span>
                )}
                {source.quote && (
                  <blockquote className="coverage-quote">
                    "{source.quote}"
                  </blockquote>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
