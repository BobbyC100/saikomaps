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
};

export function getMapTemplate(templateType: string | null | undefined): MapTemplate {
  const key = (templateType || 'field-notes').toLowerCase().replace(/\s+/g, '-');
  return MAP_TEMPLATES[key] ?? MAP_TEMPLATES['field-notes'];
}
