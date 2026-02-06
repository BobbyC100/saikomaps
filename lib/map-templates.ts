/**
 * Template styling for public map view (/map/[slug])
 * Used to apply Postcard, Field Notes, or Monocle theme based on templateType.
 */

export type TemplateId = 'postcard' | 'field-notes' | 'field_notes' | 'monocle' | string;

export interface MapTemplate {
  id: string;
  bg: string;
  text: string;
  textMuted: string;
  accent: string;
  fontClass: string;
  cardClass: string;
  headerClass: string;
}

export const MAP_TEMPLATES: Record<string, MapTemplate> = {
  postcard: {
    id: 'postcard',
    bg: '#FDF6E3',
    text: '#5D4E37',
    textMuted: '#7D6E57',
    accent: '#E8998D',
    fontClass: 'font-template-postcard',
    cardClass: 'rounded-2xl shadow-md',
    headerClass: 'rounded-2xl',
  },
  'field-notes': {
    id: 'field-notes',
    bg: '#F5F0E1',
    text: '#36454F',
    textMuted: '#5A6570',
    accent: '#8B4513',
    fontClass: 'font-template-fieldnotes',
    cardClass: 'rounded border border-current/10',
    headerClass: 'rounded border-b border-current/10',
  },
  field_notes: {
    id: 'field-notes',
    bg: '#F5F0E1',
    text: '#36454F',
    textMuted: '#5A6570',
    accent: '#8B4513',
    fontClass: 'font-template-fieldnotes',
    cardClass: 'rounded border border-current/10',
    headerClass: 'rounded border-b border-current/10',
  },
  monocle: {
    id: 'monocle',
    bg: '#1A1A1A',
    text: '#F5F5F0',
    textMuted: '#A0A0A0',
    accent: '#FFD500',
    fontClass: 'font-template-monocle',
    cardClass: 'rounded-none border border-white/10',
    headerClass: 'rounded-none border-b border-white/10',
  },
};

export function getMapTemplate(templateType: string | null | undefined): MapTemplate {
  const key = (templateType || 'postcard').toLowerCase().replace(/\s+/g, '-');
  return MAP_TEMPLATES[key] ?? MAP_TEMPLATES.postcard;
}
