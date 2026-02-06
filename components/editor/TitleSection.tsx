'use client';

import { MAP_FIELD_LIMITS } from '@/lib/mapValidation';

interface TitleSectionProps {
  title: string;
  subtitle: string;
  titlePlaceholder?: string;
  errors: Record<string, string>;
  onChange: (field: 'title' | 'subtitle', value: string) => void;
  onBlur?: () => void;
  /** Fields that were AI-suggested — show ✨ badge */
  aiSuggestedFields?: Record<string, boolean>;
}

export default function TitleSection({
  title,
  subtitle,
  titlePlaceholder = 'What this map is called',
  errors,
  onChange,
  onBlur,
  aiSuggestedFields = {},
}: TitleSectionProps) {
  const titleLen = title.length;
  const subtitleLen = subtitle.length;
  const titleNearLimit = titleLen >= 50;
  const subtitleNearLimit = subtitleLen >= 100;

  return (
    <section id="title" className="scroll-mt-8">
      <h2
        style={{
          fontFamily: 'Instrument Serif, serif',
          fontSize: '22px',
          fontWeight: 400,
          color: '#2D2D2D',
          marginBottom: '16px',
        }}
      >
        What&apos;s this map called?
        {aiSuggestedFields.title && (
          <span className="ml-2 text-sm" title="AI suggested" aria-label="AI suggested">✨</span>
        )}
      </h2>
      <div className="space-y-6">
        <div>
          <input
            type="text"
            value={title}
            onChange={(e) => onChange('title', e.target.value.slice(0, MAP_FIELD_LIMITS.title.max))}
            onBlur={onBlur}
            placeholder={titlePlaceholder}
            className="w-full px-0 py-2 bg-transparent border-0 border-b-2 border-[#efe9e3] focus:outline-none focus:ring-0 focus:border-[#D4785C] text-[#2D2D2D] placeholder:text-[#9A9A9A]"
            style={{
              fontFamily: 'Instrument Serif, serif',
              fontSize: '20px',
            }}
          />
          <div
            className="text-xs text-right mt-1"
            style={{ color: '#d0ccc7' }}
          >
            {titleLen}/{MAP_FIELD_LIMITS.title.max}
          </div>
          {errors.title && <p className="text-sm text-[#C0392B] mt-1">{errors.title}</p>}
        </div>

        <div>
          {aiSuggestedFields.subtitle && (
            <span className="text-xs text-[#9A9A9A] mb-1 block">✨ AI suggested</span>
          )}
          <input
            type="text"
            value={subtitle}
            onChange={(e) =>
              onChange('subtitle', e.target.value.slice(0, MAP_FIELD_LIMITS.subtitle.max))
            }
            onBlur={onBlur}
            placeholder="A factual detail — neighborhood, year, context"
            className="w-full px-0 py-2 bg-transparent border-0 border-b-2 border-[#efe9e3] focus:outline-none focus:ring-0 focus:border-[#D4785C] text-[#2D2D2D] placeholder:text-[#9A9A9A]"
            style={{
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '14px',
            }}
          />
          <div
            className={`text-xs text-right mt-1 ${subtitleNearLimit ? 'text-[#D4785C]' : ''}`}
            style={!subtitleNearLimit ? { color: '#d0ccc7' } : undefined}
          >
            {subtitleLen}/{MAP_FIELD_LIMITS.subtitle.max}
          </div>
          {errors.subtitle && <p className="text-sm text-[#C0392B] mt-1">{errors.subtitle}</p>}
        </div>
      </div>
    </section>
  );
}
