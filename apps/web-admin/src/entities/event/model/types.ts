/**
 * Event Entity Types
 * FSD: entities/event/model
 */

export type CenturyFilter = 'all' | number

export interface FilterChip {
  key: string
  label: string
  onClear: () => void
}

