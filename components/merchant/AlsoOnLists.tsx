/**
 * Tier 5 - Also On Lists
 * Discovery: cross-references to other lists
 */

import { ListReference } from '@/lib/types/merchant';

interface AlsoOnListsProps {
  lists: ListReference[];
}

export function AlsoOnLists({ lists }: AlsoOnListsProps) {
  // Guard: only render if lists exist
  if (!lists || lists.length === 0) {
    return null;
  }

  return (
    <div className="also-on-lists">
      <h3 className="also-on-title">Also Featured On</h3>
      <ul className="lists-grid">
        {lists.map((list) => (
          <li key={list.id} className="list-card">
            <a href={`/map/${list.slug}`} className="list-link">
              {list.coverImage && (
                <img
                  src={list.coverImage}
                  alt={list.title}
                  className="list-cover"
                />
              )}
              <span className="list-title">{list.title}</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
