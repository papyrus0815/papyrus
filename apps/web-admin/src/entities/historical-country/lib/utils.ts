import { HistoricalCountry } from '../api'
import {
  STATE_TYPE_LABELS,
  STATE_TYPE_COLORS,
  STATE_TYPE_EMOJIS,
} from '../model/constants'

/**
 * 국가 형태 레이블 가져오기
 */
export function getStateTypeLabel(
  stateType: HistoricalCountry['stateType'],
): string {
  return STATE_TYPE_LABELS[stateType] || '알 수 없음'
}

/**
 * 국가 형태 색상 가져오기
 */
export function getStateTypeColor(
  stateType: HistoricalCountry['stateType'],
): string {
  return STATE_TYPE_COLORS[stateType] || '#6b7280'
}

/**
 * 국가 형태 이모지 가져오기
 */
export function getStateTypeEmoji(
  stateType: HistoricalCountry['stateType'],
): string {
  return STATE_TYPE_EMOJIS[stateType] || '🏴'
}
