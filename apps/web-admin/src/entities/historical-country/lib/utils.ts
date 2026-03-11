import { HistoricalCountry } from '../api'
import {
  STATE_TYPE_LABELS,
  STATE_TYPE_COLORS,
  STATE_TYPE_EMOJIS,
  ENTITY_KIND_LABELS,
  ENTITY_KIND_COLORS,
  ENTITY_KIND_EMOJIS,
  type HistoricalEntityKind,
} from '../model/constants'

/**
 * 국가 형태 레이블 가져오기
 */
export function getStateTypeLabel(
  stateType: HistoricalCountry['stateType'] | string,
): string {
  return STATE_TYPE_LABELS[stateType as keyof typeof STATE_TYPE_LABELS] || '알 수 없음'
}

/**
 * 정치체 성격 레이블 (국가/정권/시대)
 */
export function getEntityKindLabel(kind: HistoricalEntityKind | null | undefined): string {
  if (!kind) return '과거 정치체'
  return ENTITY_KIND_LABELS[kind] || kind
}

export function getEntityKindColor(kind: HistoricalEntityKind | null | undefined): string {
  if (!kind) return '#6b7280'
  return ENTITY_KIND_COLORS[kind] || '#6b7280'
}

export function getEntityKindEmoji(kind: HistoricalEntityKind | null | undefined): string {
  if (!kind) return '🏛️'
  return ENTITY_KIND_EMOJIS[kind] || '🏛️'
}

/**
 * 국가 형태 색상 가져오기
 */
export function getStateTypeColor(
  stateType: HistoricalCountry['stateType'] | string,
): string {
  return STATE_TYPE_COLORS[stateType as keyof typeof STATE_TYPE_COLORS] || '#6b7280'
}

/**
 * 국가 형태 이모지 가져오기
 */
export function getStateTypeEmoji(
  stateType: HistoricalCountry['stateType'] | string,
): string {
  return STATE_TYPE_EMOJIS[stateType as keyof typeof STATE_TYPE_EMOJIS] || '🏴'
}
