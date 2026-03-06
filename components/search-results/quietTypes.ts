// Quiet card data types

export interface QuietCardData {
  type: 'tip' | 'stat' | 'energy';
  content: string;
  label?: string;
  number?: string;
  icon?: 'info' | 'star' | 'calendar';
}
