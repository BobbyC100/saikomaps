/**
 * Map Card Components
 * 
 * Three variants for displaying maps (curated collections) in different contexts:
 * - MapCard2x1: Horizontal layout for search results (2 columns wide)
 * - MapCard2x2: Featured/editorial layout (2x2 grid span)
 * - MapTitleBlock: Text-only variant (no image)
 * 
 * Visual differentiation from Place cards:
 * - 2px khaki border (vs 1px subtle for Places)
 * - "MAP · X PLACES" label
 * - Horizontal layout (2x1) vs vertical (most Place cards)
 */

export { MapCard2x1 } from './MapCard2x1'
export { MapCard2x2 } from './MapCard2x2'
export { MapTitleBlock } from './MapTitleBlock'
export type { MapCardData, MapCardProps } from './types'
