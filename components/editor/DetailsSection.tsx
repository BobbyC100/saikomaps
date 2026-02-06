'use client';

import { useState, useRef, useEffect } from 'react';
import {
  MAP_FIELD_LIMITS,
  SCOPE_PLACE_TYPE_OPTIONS,
  SCOPE_EXCLUSION_PRESETS,
} from '@/lib/mapValidation';
import { ChevronDown, ChevronUp, X } from 'lucide-react';

const isPreset = (e: string) =>
  SCOPE_EXCLUSION_PRESETS.includes(e as (typeof SCOPE_EXCLUSION_PRESETS)[number]);

interface DetailsSectionProps {
  scopeGeography: string;
  scopePlaceTypes: string[];
  scopeExclusions: string[];
  errors: Record<string, string>;
  defaultExpanded?: boolean;
  onChange: (
    field: 'scopeGeography' | 'scopePlaceTypes' | 'scopeExclusions',
    value: string | string[]
  ) => void;
  onBlur?: () => void;
  aiSuggestedFields?: Record<string, boolean>;
}

export default function DetailsSection({
  scopeGeography,
  scopePlaceTypes,
  scopeExclusions,
  errors,
  defaultExpanded = false,
  onChange,
  onBlur,
  aiSuggestedFields = {},
}: DetailsSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customInputValue, setCustomInputValue] = useState('');
  const customInputRef = useRef<HTMLInputElement>(null);

  const presetExclusions = scopeExclusions.filter(isPreset);
  const customExclusions = scopeExclusions.filter((e) => !isPreset(e));

  const hasContent =
    !!scopeGeography?.trim() ||
    scopePlaceTypes.length > 0 ||
    scopeExclusions.length > 0;

  useEffect(() => {
    if (showCustomInput) {
      customInputRef.current?.focus();
    }
  }, [showCustomInput]);

  const togglePlaceType = (type: string) => {
    const current = scopePlaceTypes.includes(type)
      ? scopePlaceTypes.filter((t) => t !== type)
      : [...scopePlaceTypes, type];
    onChange('scopePlaceTypes', current);
  };

  const toggleExclusionPreset = (preset: string) => {
    const current = presetExclusions.includes(preset)
      ? presetExclusions.filter((p) => p !== preset)
      : [...presetExclusions, preset];
    const next = [...current, ...customExclusions];
    onChange('scopeExclusions', next);
  };

  const addCustomExclusion = () => {
    setShowCustomInput(true);
  };

  const confirmCustomExclusion = () => {
    const trimmed = customInputValue.trim();
    if (trimmed) {
      const next = [...presetExclusions, ...customExclusions, trimmed];
      onChange('scopeExclusions', next);
      setCustomInputValue('');
      onBlur?.();
    } else {
      setShowCustomInput(false);
      onBlur?.();
    }
  };

  const removeCustomExclusion = (toRemove: string) => {
    const next = scopeExclusions.filter((e) => e !== toRemove);
    onChange('scopeExclusions', next);
  };

  const previewPills = [
    ...(scopeGeography?.trim() ? [scopeGeography] : []),
    ...scopePlaceTypes,
  ].slice(0, 4);
  const previewLine = previewPills.length > 0
    ? previewPills.join(' · ')
    : 'No details yet';

  return (
    <section id="details" className="scroll-mt-8">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-0 bg-transparent border-0 cursor-pointer text-left"
      >
        <h2
          style={{
            fontFamily: 'Instrument Serif, serif',
            fontSize: '22px',
            fontWeight: 400,
            color: '#2D2D2D',
          }}
        >
          Details
          {hasContent && (
            <span
              className="ml-2 inline-flex w-5 h-5 rounded-full text-white text-xs font-bold items-center justify-center"
              style={{ backgroundColor: '#D4785C' }}
            >
              ✓
            </span>
          )}
        </h2>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-[#6B6B6B]" />
        ) : (
          <ChevronDown className="w-5 h-5 text-[#6B6B6B]" />
        )}
      </button>

      {!isExpanded && (
        <div className="mt-2 flex items-center gap-2 flex-wrap">
          <span className="text-sm text-[#6B6B6B] truncate max-w-md">{previewLine}</span>
          {previewPills.length > 0 && (
            <span
              className="px-2 py-0.5 rounded text-xs"
              style={{ backgroundColor: '#efe9e3', color: '#6B6B6B' }}
            >
              auto-detected
            </span>
          )}
        </div>
      )}

      {isExpanded && (
        <div className="mt-4 space-y-6">
          {/* Where */}
          <div>
            {aiSuggestedFields.scopeGeography && (
              <span className="text-xs text-[#9A9A9A] mb-2 block">✨ AI suggested</span>
            )}
            <label
              className="block mb-2"
              style={{
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '12px',
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
                color: '#aaa',
              }}
            >
              Where
            </label>
            <input
              type="text"
              value={scopeGeography}
              onChange={(e) =>
                onChange(
                  'scopeGeography',
                  e.target.value.slice(0, MAP_FIELD_LIMITS.scopeGeography.max)
                )
              }
              onBlur={onBlur}
              placeholder="Silver Lake, Los Angeles / Coastal Highway 1, Big Sur to Carmel"
              className="w-full px-0 py-2 bg-transparent border-0 border-b border-[#efe9e3] focus:outline-none focus:ring-0 focus:border-[#D4785C] focus:border-b-2 text-[#2D2D2D] placeholder:text-[#9A9A9A]"
            />
            <div
              className="text-xs text-right mt-1"
              style={{ color: '#aaa' }}
            >
              {scopeGeography.length}/{MAP_FIELD_LIMITS.scopeGeography.max} characters
            </div>
            {errors.scopeGeography && (
              <p className="text-sm text-[#C0392B] mt-1">{errors.scopeGeography}</p>
            )}
          </div>

          {/* What kinds of places */}
          <div>
            {aiSuggestedFields.scopePlaceTypes && (
              <span className="text-xs text-[#9A9A9A] mb-2 block">✨ AI suggested</span>
            )}
            <label
              className="block mb-2"
              style={{
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '12px',
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
                color: '#aaa',
              }}
            >
              What kinds of places
            </label>
            <div className="flex flex-wrap gap-2">
              {SCOPE_PLACE_TYPE_OPTIONS.map((type) => {
                const selected = scopePlaceTypes.includes(type);
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => togglePlaceType(type)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-full border transition-colors ${
                      selected
                        ? 'bg-[#D4785C] text-white border-[#D4785C]'
                        : 'bg-transparent text-[#6B6B6B] border-[#efe9e3] hover:border-[#D4785C]/50'
                    }`}
                  >
                    {type}
                  </button>
                );
              })}
            </div>
            {errors.scopePlaceTypes && (
              <p className="text-sm text-[#C0392B] mt-1">{errors.scopePlaceTypes}</p>
            )}
          </div>

          {/* What's not on this map */}
          <div>
            <label
              className="block mb-2"
              style={{
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '12px',
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
                color: '#aaa',
              }}
            >
              What&apos;s not on this map
            </label>
            <div className="flex flex-wrap gap-2 items-center">
              {SCOPE_EXCLUSION_PRESETS.map((preset) => {
                const selected = presetExclusions.includes(preset);
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => toggleExclusionPreset(preset)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-full border transition-colors ${
                      selected
                        ? 'bg-[#D4785C] text-white border-[#D4785C]'
                        : 'bg-transparent text-[#6B6B6B] border-[#efe9e3] hover:border-[#D4785C]/50'
                    }`}
                  >
                    {preset}
                  </button>
                );
              })}
              {customExclusions.map((custom) => (
                <span
                  key={custom}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-full border border-[#D4785C] bg-[#D4785C]/10 text-[#2D2D2D]"
                >
                  {custom}
                  <button
                    type="button"
                    onClick={() => removeCustomExclusion(custom)}
                    className="p-0.5 rounded hover:bg-[#D4785C]/20 transition-colors"
                    aria-label={`Remove ${custom}`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
              <button
                type="button"
                onClick={addCustomExclusion}
                className="px-3 py-1.5 text-sm font-medium rounded-full border border-dashed border-[#efe9e3] text-[#6B6B6B] hover:border-[#D4785C]/50 hover:text-[#D4785C] transition-colors cursor-pointer"
              >
                + Custom
              </button>
            </div>
            {showCustomInput && (
              <div className="mt-2 flex gap-2 items-center">
                <input
                  ref={customInputRef}
                  type="text"
                  value={customInputValue}
                  onChange={(e) => setCustomInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      confirmCustomExclusion();
                    }
                    if (e.key === 'Escape') {
                      setCustomInputValue('');
                      setShowCustomInput(false);
                    }
                  }}
                  onBlur={confirmCustomExclusion}
                  placeholder="e.g. No spots east of the river"
                  className="flex-1 px-0 py-2 bg-transparent border-0 border-b border-[#efe9e3] focus:outline-none focus:ring-0 focus:border-[#D4785C] focus:border-b-2 text-[#2D2D2D] placeholder:text-[#9A9A9A] text-sm"
                />
                <button
                  type="button"
                  onClick={confirmCustomExclusion}
                  className="px-3 py-1.5 text-sm font-medium text-white rounded-lg transition-colors"
                  style={{ backgroundColor: '#D4785C' }}
                >
                  Add
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
