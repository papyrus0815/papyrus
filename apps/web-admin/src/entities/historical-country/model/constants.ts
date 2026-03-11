import { HistoricalStateType } from '../api'

/** 역사적 정치체 성격 (API와 동기화) */
export type HistoricalEntityKind = 'STATE' | 'REGIME' | 'PERIOD'

/**
 * 국가 형태 레이블
 */
export const STATE_TYPE_LABELS: Record<HistoricalStateType | 'SHOGUNATE', string> = {
  EMPIRE: '제국',
  KINGDOM: '왕국',
  PRINCIPALITY: '공국',
  ELECTORATE: '선제후국',
  MARGRAVIATE: '변경백령',
  REPUBLIC: '공화국',
  FEDERATION: '연방',
  CONFEDERATION: '연합',
  CITY_STATE: '도시 국가',
  CALIPHATE: '칼리프국',
  SULTANATE: '술탄국',
  KHANATE: '칸국',
  THEOCRACY: '신정 국가',
  TRIBAL_STATE: '부족 국가',
  NOMADIC_EMPIRE: '유목 제국',
  DYNASTY: '왕조',
  HEREDITARY: '세습',
  SHOGUNATE: '막부',
  PERSONAL_UNION: '동군연합',
  OTHER: '기타',
}

/** 정치체 성격 레이블 (국가/정권/시대) */
export const ENTITY_KIND_LABELS: Record<HistoricalEntityKind, string> = {
  STATE: '주권 국가',
  REGIME: '정권·군정',
  PERIOD: '시대',
}

/** 정치체 성격 색상 */
export const ENTITY_KIND_COLORS: Record<HistoricalEntityKind, string> = {
  STATE: '#3b82f6',
  REGIME: '#8b5cf6',
  PERIOD: '#10b981',
}

/** 정치체 성격 이모지 */
export const ENTITY_KIND_EMOJIS: Record<HistoricalEntityKind, string> = {
  STATE: '🏛️',
  REGIME: '⚔️',
  PERIOD: '📅',
}

/**
 * 국가 형태별 색상
 */
export const STATE_TYPE_COLORS: Record<HistoricalStateType | 'SHOGUNATE', string> = {
  EMPIRE: '#8b5cf6', // 보라색
  KINGDOM: '#3b82f6', // 파란색
  PRINCIPALITY: '#06b6d4', // 청록색
  ELECTORATE: '#0ea5e9', // 스카이
  MARGRAVIATE: '#14b8a6', // 틸
  REPUBLIC: '#10b981', // 녹색
  FEDERATION: '#f59e0b', // 주황색
  CONFEDERATION: '#f97316', // 주황색
  CITY_STATE: '#ec4899', // 핑크색
  CALIPHATE: '#7c3aed', // 보라
  SULTANATE: '#2563eb', // 남색
  KHANATE: '#ca8a04', // 금색
  THEOCRACY: '#a855f7', // 연보라색
  TRIBAL_STATE: '#84cc16', // 연두색
  NOMADIC_EMPIRE: '#eab308', // 노란색
  DYNASTY: '#6366f1', // 인디고
  HEREDITARY: '#7c3aed', // 보라
  SHOGUNATE: '#7c2d12', // 적갈색 (막부)
  PERSONAL_UNION: '#8b5cf6', // 보라
  OTHER: '#6b7280', // 회색
}

/**
 * 국가 형태별 이모지
 */
export const STATE_TYPE_EMOJIS: Record<HistoricalStateType | 'SHOGUNATE', string> = {
  EMPIRE: '👑',
  KINGDOM: '🏰',
  PRINCIPALITY: '🏛️',
  ELECTORATE: '⚜️',
  MARGRAVIATE: '🏴',
  REPUBLIC: '🏛️',
  FEDERATION: '🤝',
  CONFEDERATION: '🔗',
  CITY_STATE: '🏙️',
  CALIPHATE: '☪️',
  SULTANATE: '🕌',
  KHANATE: '🏹',
  THEOCRACY: '⛪',
  TRIBAL_STATE: '🏕️',
  NOMADIC_EMPIRE: '🐎',
  DYNASTY: '👨‍👩‍👧‍👦',
  HEREDITARY: '🏛️',
  SHOGUNATE: '⚔️',
  PERSONAL_UNION: '👥',
  OTHER: '🏴',
}
