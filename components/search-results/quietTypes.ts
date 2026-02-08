// Quiet card data types

export interface QuietCardData {
  type: 'tip' | 'stat' | 'vibe';
  content: string;
  label?: string;
  number?: string;
  icon?: 'info' | 'star' | 'calendar';
}
