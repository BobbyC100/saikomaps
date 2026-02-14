/**
 * Tier 0 - Hero Header
 * Identity layer: hero photo, name, tagline
 */

import { Photo } from '@/lib/types/merchant';

interface HeroHeaderProps {
  heroPhoto: Photo;
  name: string;
  tagline?: string;
}

export function HeroHeader({ heroPhoto, name, tagline }: HeroHeaderProps) {
  return (
    <header className="hero-header">
      <div className="hero-image-container">
        <img
          src={heroPhoto.url}
          alt={heroPhoto.alt || name}
          className="hero-image"
        />
      </div>
      <div className="hero-content">
        <h1 className="merchant-name">{name}</h1>
        {tagline && <p className="merchant-tagline">{tagline}</p>}
      </div>
    </header>
  );
}
