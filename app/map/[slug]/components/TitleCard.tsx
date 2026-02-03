'use client';

import { useState, useCallback, useEffect } from 'react';
import { Instagram, Link2, Pencil, RefreshCw } from 'lucide-react';
import { type MapTemplate } from '@/lib/map-templates';

interface TitleCardProps {
  mapData: {
    id?: string;
    title: string;
    subtitle?: string | null;
    description?: string | null;
    descriptionSource?: string | null;
    coverImageUrl?: string | null;
    /** 3-photo collage from different places (when map has 3+ places). Takes precedence over coverImageUrl. */
    coverImageUrls?: string[];
    creatorName: string;
    createdAt: string | Date;
    updatedAt: string | Date;
    locations: Array<{ category?: string | null }>;
    slug: string;
  };
  isOwner: boolean;
  template: MapTemplate;
  onEdit?: () => void;
  onDescriptionUpdate?: (description: string | null, descriptionSource: string | null) => void;
  /** Dev only: pass X-Dev-Owner header for API calls when acting as owner without login */
  devOwner?: boolean;
}

export function TitleCard({ mapData, isOwner, template, onEdit, onDescriptionUpdate, devOwner }: TitleCardProps) {
  const [copied, setCopied] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editDescriptionValue, setEditDescriptionValue] = useState(mapData.description ?? '');
  const [isSavingDescription, setIsSavingDescription] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const saveDescription = useCallback(
    async (value: string) => {
      const trimmed = value.trim();
      if (!onDescriptionUpdate || !mapData.id) return;
      setIsSavingDescription(true);
      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (devOwner) headers['X-Dev-Owner'] = '1';
        const res = await fetch(`/api/maps/${mapData.id}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            description: trimmed || null,
            descriptionSource: trimmed ? 'edited' : null,
          }),
        });
        if (res.ok) {
          onDescriptionUpdate(trimmed || null, trimmed ? 'edited' : null);
        }
      } catch (err) {
        console.error('Failed to save description:', err);
      } finally {
        setIsSavingDescription(false);
        setIsEditingDescription(false);
      }
    },
    [mapData.id, onDescriptionUpdate, devOwner]
  );

  const handleRegenerate = useCallback(async () => {
    if (!mapData.id || !onDescriptionUpdate) return;
    setIsRegenerating(true);
    try {
      const headers: Record<string, string> = {};
      if (devOwner) headers['X-Dev-Owner'] = '1';
      const res = await fetch(`/api/maps/${mapData.id}/regenerate-description`, {
        method: 'POST',
        headers,
      });
      const json = await res.json();
      if (res.ok && json?.data != null) {
        onDescriptionUpdate(json.data.description ?? null, json.data.descriptionSource ?? 'ai');
      }
    } catch (err) {
      console.error('Failed to regenerate description:', err);
    } finally {
      setIsRegenerating(false);
    }
  }, [mapData.id, onDescriptionUpdate, devOwner]);

  useEffect(() => {
    if (!isEditingDescription) setEditDescriptionValue(mapData.description ?? '');
  }, [mapData.description, isEditingDescription]);

  // Get most common category from locations
  const category = mapData.locations
    .map((loc) => loc.category)
    .filter(Boolean)
    .reduce((acc: Record<string, number>, cat) => {
      acc[cat as string] = (acc[cat as string] || 0) + 1;
      return acc;
    }, {});
  
  const topCategory = Object.entries(category).sort(([, a], [, b]) => b - a)[0]?.[0];

  // Format date
  const updatedDate = new Date(mapData.updatedAt);
  const createdDate = new Date(mapData.createdAt);
  const isUpdated = updatedDate.getTime() > createdDate.getTime() + 24 * 60 * 60 * 1000; // More than 1 day difference
  const displayDate = isUpdated ? updatedDate : createdDate;
  const dateText = isUpdated 
    ? `Updated ${formatDate(displayDate)}`
    : `Created ${formatDate(displayDate)}`;

  const shareUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/map/${mapData.slug}`
    : '';

  const handleCopyLink = async () => {
    if (shareUrl) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy link:', err);
      }
    }
  };

  const handleInstagramShare = () => {
    // TODO: Implement Instagram story image generation
    console.log('Share to Instagram');
  };

  // Always use coral color for title card, regardless of template
  const coralAccent = '#E07A5F';
  
  // Wavy divider component
  const WavyDivider = () => (
    <svg width="100" height="8" viewBox="0 0 100 8" fill="none" style={{ margin: '0 auto 24px' }}>
      <path
        d="M0 4C8 4 8 1 16 1C24 1 24 7 32 7C40 7 40 1 48 1C56 1 56 7 64 7C72 7 72 1 80 1C88 1 88 4 100 4"
        stroke={coralAccent}
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
  
  return (
    <div
      className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 mb-8"
      style={{
        backgroundColor: '#FFFFFF',
        borderTop: '4px solid #E07A5F',
        boxShadow: '0 4px 12px rgba(224, 122, 95, 0.15), 0 2px 4px rgba(0,0,0,0.04)',
        padding: '36px 44px',
        textAlign: 'center',
        borderRadius: '2px',
        position: 'relative',
        zIndex: 1,
      }}
    >
      {/* Cover Image — single or 2–3 photo collage when map has 3+ places */}
      {(mapData.coverImageUrls && mapData.coverImageUrls.length >= 2 ? (
        <div
          style={{
            marginBottom: '20px',
            width: '100%',
            maxWidth: '400px',
            marginLeft: 'auto',
            marginRight: 'auto',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr',
              gridTemplateRows: mapData.coverImageUrls.length >= 3 ? '1fr 1fr' : '1fr',
              gap: '4px',
              borderRadius: '12px',
              overflow: 'hidden',
              aspectRatio: '16/9',
            }}
          >
            <img
              src={mapData.coverImageUrls[0]}
              alt={mapData.title}
              style={{
                gridRow: mapData.coverImageUrls.length >= 3 ? 'span 2' : 'span 1',
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                minHeight: 0,
              }}
            />
            <img
              src={mapData.coverImageUrls[1]}
              alt=""
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                minHeight: 0,
              }}
            />
            {mapData.coverImageUrls[2] && (
              <img
                src={mapData.coverImageUrls[2]}
                alt=""
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  minHeight: 0,
                }}
              />
            )}
          </div>
        </div>
      ) : mapData.coverImageUrl ? (
        <div
          style={{
            marginBottom: '20px',
            width: '100%',
            maxWidth: '400px',
            marginLeft: 'auto',
            marginRight: 'auto',
          }}
        >
          <img
            src={mapData.coverImageUrl}
            alt={mapData.title}
            style={{
              width: '100%',
              maxWidth: '400px',
              height: 'auto',
              aspectRatio: '16/9',
              objectFit: 'cover',
              borderRadius: '12px',
              margin: '0 auto',
              display: 'block',
            }}
          />
        </div>
      ) : null)}

      {/* Category (optional) */}
      {topCategory && (
        <div
          style={{
            fontSize: '11px',
            fontWeight: 500,
            color: '#E07A5F',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            marginBottom: '12px',
          }}
        >
          {topCategory}
        </div>
      )}

      {/* Title */}
      <h1
        style={{
          fontSize: '32px',
          fontWeight: 400,
          fontFamily: '"Playfair Display", Georgia, serif',
          fontStyle: 'italic',
          color: '#1A1A1A',
          margin: '0 0 14px 0',
          lineHeight: 1.1,
        }}
      >
        {mapData.title}
      </h1>

      {/* Map description (AI-generated or edited) */}
      {(mapData.description || isEditingDescription || (isOwner && !mapData.description)) && (
        <div style={{ marginBottom: '20px', maxWidth: '400px', marginLeft: 'auto', marginRight: 'auto' }}>
          {isEditingDescription ? (
            <textarea
              value={editDescriptionValue}
              onChange={(e) => setEditDescriptionValue(e.target.value)}
              onBlur={() => saveDescription(editDescriptionValue)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  (e.target as HTMLTextAreaElement).blur();
                }
              }}
              placeholder="Add a description..."
              autoFocus
              disabled={isSavingDescription}
              style={{
                width: '100%',
                minHeight: '60px',
                fontSize: '15px',
                fontFamily: '"DM Sans", sans-serif',
                fontStyle: 'italic',
                color: '#8a8580',
                lineHeight: 1.5,
                border: '1px solid #E5E5E5',
                borderRadius: '8px',
                padding: '10px 12px',
                resize: 'vertical',
                backgroundColor: '#FAFAFA',
              }}
            />
          ) : (
            <div
              onClick={() => {
                if (isOwner && onDescriptionUpdate) {
                  setEditDescriptionValue(mapData.description ?? '');
                  setIsEditingDescription(true);
                }
              }}
              style={{
                cursor: isOwner ? 'text' : 'default',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <p
                style={{
                  fontSize: '15px',
                  fontFamily: '"DM Sans", sans-serif',
                  fontStyle: 'italic',
                  color: '#8a8580',
                  lineHeight: 1.55,
                  margin: 0,
                  flex: 1,
                }}
              >
                {mapData.description || (isOwner ? 'Click to add a description...' : '')}
              </p>
              {isOwner && (mapData.description || mapData.locations.length >= 2) && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRegenerate();
                  }}
                  disabled={isRegenerating}
                  title={mapData.description ? 'Regenerate description' : 'Generate description'}
                  style={{
                    flexShrink: 0,
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    border: '1px solid #E5E5E5',
                    background: 'transparent',
                    cursor: isRegenerating ? 'wait' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#E07A5F',
                  }}
                >
                  <RefreshCw size={14} className={isRegenerating ? 'animate-spin' : ''} />
                </button>
              )}
            </div>
          )}
          {mapData.descriptionSource === 'ai' && mapData.description && !isEditingDescription && (
            <p
              style={{
                fontSize: '11px',
                fontFamily: '"DM Sans", sans-serif',
                fontStyle: 'italic',
                color: '#c0b9b2',
                margin: '4px 0 0 0',
              }}
            >
              written by the map
            </p>
          )}
        </div>
      )}

      {/* Legacy subtitle (optional) */}
      {mapData.subtitle && !mapData.description && (
        <p
          style={{
            fontSize: '14px',
            color: '#6B6B6B',
            lineHeight: 1.55,
            margin: '0 auto 20px auto',
            maxWidth: '320px',
          }}
        >
          {mapData.subtitle}
        </p>
      )}

      {/* Wavy Divider */}
      <WavyDivider />

      {/* Author */}
      <div
        style={{
          fontSize: '14px',
          color: '#1A1A1A',
          marginBottom: '4px',
        }}
      >
        by <strong style={{ fontWeight: 600, fontStyle: 'italic' }}>{mapData.creatorName}</strong>
      </div>

      {/* Meta */}
      <div
        style={{
          fontSize: '12px',
          color: '#9A9A9A',
          marginBottom: '24px',
        }}
      >
        {dateText} · {mapData.locations.length} location{mapData.locations.length !== 1 ? 's' : ''}
      </div>

      {/* Actions */}
      <div
        style={{
          display: 'flex',
          gap: '10px',
          justifyContent: 'center',
          alignItems: 'center',
          position: 'relative',
          zIndex: 10,
        }}
      >
        {/* Instagram Share */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleInstagramShare();
          }}
          title="Share to Instagram"
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            backgroundColor: 'transparent',
            border: '1px solid #E5E5E5',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#E07A5F',
            transition: 'border-color 150ms ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#E07A5F'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#E5E5E5'
          }}
        >
          <Instagram size={17} strokeWidth={1.5} />
        </button>

        {/* Copy Link */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleCopyLink();
          }}
          title={copied ? 'Link copied!' : 'Copy link'}
          aria-label={copied ? 'Link copied!' : 'Copy link'}
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            backgroundColor: 'transparent',
            border: '1px solid #E5E5E5',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#E07A5F',
            transition: 'border-color 150ms ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#E07A5F'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#E5E5E5'
          }}
        >
          <Link2 size={17} strokeWidth={1.5} />
        </button>

        {/* Edit (owner only) */}
        {isOwner && onEdit && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onEdit();
            }}
            title="Edit map"
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              backgroundColor: 'transparent',
              border: '1px solid #E5E5E5',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#E07A5F',
              transition: 'border-color 150ms ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#E07A5F'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#E5E5E5'
            }}
          >
            <Pencil size={17} strokeWidth={1.5} />
          </button>
        )}
      </div>
    </div>
  );
}

function formatDate(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}
