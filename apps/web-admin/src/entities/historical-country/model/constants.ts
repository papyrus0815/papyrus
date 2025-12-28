import { HistoricalStateType } from '../api'

/**
 * 국가 형태 레이블
 */
export const STATE_TYPE_LABELS: Record<HistoricalStateType, string> = {
  EMPIRE: '제국',
  KINGDOM: '왕국',
  PRINCIPALITY: '공국',
  REPUBLIC: '공화국',
  FEDERATION: '연방',
  CONFEDERATION: '연합',
  CITY_STATE: '도시 국가',
  THEOCRACY: '신정 국가',
  TRIBAL_STATE: '부족 국가',
  NOMADIC_EMPIRE: '유목 제국',
  OTHER: '기타',
}

/**
 * 국가 형태별 색상
 */
export const STATE_TYPE_COLORS: Record<HistoricalStateType, string> = {
  EMPIRE: '#8b5cf6', // 보라색
  KINGDOM: '#3b82f6', // 파란색
  PRINCIPALITY: '#06b6d4', // 청록색
  REPUBLIC: '#10b981', // 녹색
  FEDERATION: '#f59e0b', // 주황색
  CONFEDERATION: '#f97316', // 주황색
  CITY_STATE: '#ec4899', // 핑크색
  THEOCRACY: '#a855f7', // 연보라색
  TRIBAL_STATE: '#84cc16', // 연두색
  NOMADIC_EMPIRE: '#eab308', // 노란색
  OTHER: '#6b7280', // 회색
}

/**
 * 국가 형태별 이모지
 */
export const STATE_TYPE_EMOJIS: Record<HistoricalStateType, string> = {
  EMPIRE: '👑',
  KINGDOM: '🏰',
  PRINCIPALITY: '🏛️',
  REPUBLIC: '🏛️',
  FEDERATION: '🤝',
  CONFEDERATION: '🔗',
  CITY_STATE: '🏙️',
  THEOCRACY: '⛪',
  TRIBAL_STATE: '🏕️',
  NOMADIC_EMPIRE: '🐎',
  OTHER: '🏴',
}
