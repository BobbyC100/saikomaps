'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { Share2, Pencil } from 'lucide-react';
import { getMapTemplate, type MapTemplate } from '@/lib/map-templates';

interface TitleCardProps {
  mapData: {
    title: string;
    subtitle?: string | null;
    coverImageUrl?: string | null;
    creatorName: string;
    createdAt: string | Date;
    updatedAt: string | Date;
    locations: Array<{ category?: string | null }>;
    slug: string;
  };
  isOwner: boolean;
  template: MapTemplate;
  onEdit?: () => void;
}

export function TitleCard({ mapData, isOwner, template, onEdit }: TitleCardProps) {
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const sharePanelRef = useRef<HTMLDivElement>(null);

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

  const copyShareLink = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      setShareOpen(false);
    }
  };

  const shareToInstagram = () => {
    // Instagram doesn't support direct URL sharing
    // Open modal with instructions or generate shareable image
    alert('To share on Instagram:\n1. Copy the link below\n2. Post it in your story or caption\n3. Or download a shareable image (coming soon)');
    copyShareLink();
    setShareOpen(false);
  };

  // Close share dropdown when clicking outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (sharePanelRef.current && !sharePanelRef.current.contains(e.target as Node)) {
        setShareOpen(false);
      }
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  return (
    <div
      className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 mb-8"
      style={{
        border: `1px solid ${template.accent}40`, // Coral accent with opacity
        borderRadius: '12px',
        padding: '32px',
        backgroundColor: template.bg === '#1A1A1A' ? '#2A2A2A' : template.bg === '#FDF6E3' ? '#FFFFFF' : template.bg === '#F5F0E1' ? '#FFFFFF' : 'rgba(255,255,255,0.6)',
        textAlign: 'center',
      }}
    >
      {/* Cover Image */}
      {mapData.coverImageUrl && (
        <div className="mb-6 flex justify-center">
          <div
            style={{
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              overflow: 'hidden',
              border: `2px solid ${template.accent}`,
            }}
          >
            <Image
              src={mapData.coverImageUrl}
              alt={mapData.title}
              width={120}
              height={120}
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      )}

      {/* Category */}
      {topCategory && (
        <div
          className="mb-3 text-xs font-bold uppercase tracking-wider"
          style={{ color: '#E8998D' }} // Coral color
        >
          {topCategory}
        </div>
      )}

      {/* Title */}
      <h1
        className="text-4xl lg:text-5xl font-bold mb-3"
        style={{ color: template.text }}
      >
        {mapData.title}
      </h1>

      {/* Description */}
      {mapData.subtitle && (
        <p
          className="text-lg mb-4"
          style={{ color: template.textMuted }}
        >
          {mapData.subtitle}
        </p>
      )}

      {/* Metadata */}
      <div
        className="text-sm mb-6 space-y-1"
        style={{ color: template.textMuted }}
      >
        <div>by {mapData.creatorName}</div>
        <div>{dateText}</div>
        <div>{mapData.locations.length} location{mapData.locations.length !== 1 ? 's' : ''}</div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-center gap-3">
        {/* Share Button */}
        <div className="relative" ref={sharePanelRef}>
          <button
            type="button"
            onClick={() => setShareOpen((o) => !o)}
            className="px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2"
            style={{
              backgroundColor: template.bg === '#1A1A1A' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
              color: template.text,
            }}
          >
            <Share2 size={16} />
            Share
          </button>
          {shareOpen && (
            <div
              className="absolute left-1/2 -translate-x-1/2 top-full mt-2 py-2 min-w-[180px] rounded-lg shadow-lg z-50 border"
              style={{
                backgroundColor: template.bg === '#1A1A1A' ? '#2A2A2A' : '#fff',
                borderColor: template.bg === '#1A1A1A' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
              }}
            >
              <button
                type="button"
                onClick={copyShareLink}
                className="w-full px-4 py-2.5 text-left text-sm font-medium hover:opacity-80 flex items-center gap-2"
                style={{ color: template.text }}
              >
                {copied ? '✓ Copied!' : '📋 Copy link'}
              </button>
              <button
                type="button"
                onClick={shareToInstagram}
                className="w-full px-4 py-2.5 text-left text-sm font-medium hover:opacity-80 flex items-center gap-2"
                style={{ color: template.text }}
              >
                📷 Share to Instagram
              </button>
            </div>
          )}
        </div>

        {/* Edit Button (Owner only) */}
        {isOwner && onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2"
            style={{
              backgroundColor: template.bg === '#1A1A1A' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
              color: template.text,
            }}
          >
            <Pencil size={16} />
            Edit
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
