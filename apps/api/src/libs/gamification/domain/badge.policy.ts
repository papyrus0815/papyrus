import { AggregateType } from '@prisma/client'

/**
 * 뱃지 카탈로그 + 획득 기준 (코드 상수로 관리).
 * 획득 사실(누가/언제)만 DB(AccountBadge)에 저장하고, 정의는 여기서 관리한다.
 * 뱃지는 영구 — 한 번 획득하면 콘텐츠를 삭제해도 회수하지 않는다.
 */

export type BadgeCode =
  | 'FIRST_STEP'
  | 'CONTRIBUTOR_10'
  | 'CONTRIBUTOR_50'
  | 'CONTRIBUTOR_100'
  | 'POINT_500'
  | 'POINT_1500'
  | 'PERSON_10'
  | 'EVENT_10'
  | 'COUNTRY_5'
  | 'DIVISION_10'
  | 'DIVISION_50'
  | 'STREAK_3'
  | 'STREAK_7'
  | 'COUNTRY_SPECIALIST_10'
  | 'COUNTRY_SPECIALIST_30'
  | 'COUNTRY_SPECIALIST_50'
  | 'CENTURY_SPECIALIST_10'
  | 'CENTURY_SPECIALIST_30'
  | 'CENTURY_SPECIALIST_50'

/** 뱃지 평가에 필요한 계정 통계 */
export interface BadgeStats {
  /** 현재 유효 기여 수(적립-회수) */
  contributionCount: number
  /** 누적 점수 */
  totalPoints: number
  /** 콘텐츠 타입별 유효 등록 수 */
  countByType: Partial<Record<AggregateType, number>>
  /** 현재 연속 등록 일수 */
  streakDays: number
  /** 단일 국가에 기여한 최대 net 등록 수 (지역 전문가 뱃지용) */
  maxCountryContribution: number
  /** 단일 세기에 기여한 최대 net 등록 수 (시대 전문가 뱃지용) */
  maxCenturyContribution: number
}

export interface BadgeDef {
  code: BadgeCode
  /** 한글 이름 */
  label: string
  /** 설명(획득 조건 안내) */
  description: string
  /** 강조 색 */
  color: string
  /** 진행 측정값 (현재 통계 기준) */
  metric: (s: BadgeStats) => number
  /** 획득 임계값 */
  target: number
}

const typeCount = (s: BadgeStats, t: AggregateType) => s.countByType[t] ?? 0

/** 뱃지 카탈로그 (표시 순서대로) */
export const BADGE_DEFS: ReadonlyArray<BadgeDef> = [
  {
    code: 'FIRST_STEP',
    label: '첫 발자국',
    description: '첫 콘텐츠를 등록했어요',
    color: '#22C55E',
    metric: (s) => s.contributionCount,
    target: 1,
  },
  {
    code: 'CONTRIBUTOR_10',
    label: '기록가',
    description: '콘텐츠 10건 등록',
    color: '#3B82F6',
    metric: (s) => s.contributionCount,
    target: 10,
  },
  {
    code: 'CONTRIBUTOR_50',
    label: '편찬자',
    description: '콘텐츠 50건 등록',
    color: '#8B5CF6',
    metric: (s) => s.contributionCount,
    target: 50,
  },
  {
    code: 'CONTRIBUTOR_100',
    label: '사관',
    description: '콘텐츠 100건 등록',
    color: '#EC4899',
    metric: (s) => s.contributionCount,
    target: 100,
  },
  {
    code: 'POINT_500',
    label: '500P 달성',
    description: '누적 500점 돌파',
    color: '#F59E0B',
    metric: (s) => s.totalPoints,
    target: 500,
  },
  {
    code: 'POINT_1500',
    label: '1500P 달성',
    description: '누적 1500점 돌파',
    color: '#EF4444',
    metric: (s) => s.totalPoints,
    target: 1500,
  },
  {
    code: 'PERSON_10',
    label: '인물 수집가',
    description: '인물 10명 등록',
    color: '#14B8A6',
    metric: (s) => typeCount(s, AggregateType.PERSON),
    target: 10,
  },
  {
    code: 'EVENT_10',
    label: '연대기 작가',
    description: '사건 10건 등록',
    color: '#0EA5E9',
    metric: (s) => typeCount(s, AggregateType.EVENT),
    target: 10,
  },
  {
    code: 'COUNTRY_5',
    label: '지도 제작자',
    description: '국가 5개 등록',
    color: '#A855F7',
    metric: (s) => typeCount(s, AggregateType.COUNTRY) + typeCount(s, AggregateType.HISTORICAL_COUNTRY),
    target: 5,
  },
  {
    code: 'DIVISION_10',
    label: '강역 답사가',
    description: '행정구역 10개 등록',
    color: '#059669',
    metric: (s) => typeCount(s, AggregateType.ADMINISTRATIVE_DIVISION),
    target: 10,
  },
  {
    code: 'DIVISION_50',
    label: '여지도 편찬자',
    description: '행정구역 50개 등록',
    color: '#B45309',
    metric: (s) => typeCount(s, AggregateType.ADMINISTRATIVE_DIVISION),
    target: 50,
  },
  {
    code: 'STREAK_3',
    label: '꾸준함의 시작',
    description: '3일 연속 등록',
    color: '#F97316',
    metric: (s) => s.streakDays,
    target: 3,
  },
  {
    code: 'STREAK_7',
    label: '열정의 일주일',
    description: '7일 연속 등록',
    color: '#DC2626',
    metric: (s) => s.streakDays,
    target: 7,
  },
  {
    code: 'COUNTRY_SPECIALIST_10',
    label: '지역 전문가',
    description: '한 국가에 콘텐츠 10건 등록',
    color: '#0D9488',
    metric: (s) => s.maxCountryContribution,
    target: 10,
  },
  {
    code: 'COUNTRY_SPECIALIST_30',
    label: '지역 권위자',
    description: '한 국가에 콘텐츠 30건 등록',
    color: '#7C3AED',
    metric: (s) => s.maxCountryContribution,
    target: 30,
  },
  {
    code: 'COUNTRY_SPECIALIST_50',
    label: '지역 대가',
    description: '한 국가에 콘텐츠 50건 등록',
    color: '#B91C1C',
    metric: (s) => s.maxCountryContribution,
    target: 50,
  },
  {
    code: 'CENTURY_SPECIALIST_10',
    label: '시대 전문가',
    description: '한 세기에 콘텐츠 10건 등록',
    color: '#2563EB',
    metric: (s) => s.maxCenturyContribution,
    target: 10,
  },
  {
    code: 'CENTURY_SPECIALIST_30',
    label: '시대 권위자',
    description: '한 세기에 콘텐츠 30건 등록',
    color: '#9333EA',
    metric: (s) => s.maxCenturyContribution,
    target: 30,
  },
  {
    code: 'CENTURY_SPECIALIST_50',
    label: '시대 대가',
    description: '한 세기에 콘텐츠 50건 등록',
    color: '#C2410C',
    metric: (s) => s.maxCenturyContribution,
    target: 50,
  },
]

const BADGE_BY_CODE = new Map(BADGE_DEFS.map((b) => [b.code, b]))

export function badgeDef(code: string): BadgeDef | undefined {
  return BADGE_BY_CODE.get(code as BadgeCode)
}

/** 뱃지 획득 여부 */
export function isBadgeEarned(def: BadgeDef, stats: BadgeStats): boolean {
  return def.metric(stats) >= def.target
}

/** 진행도 — 현재값(타깃 상한으로 캡)과 타깃 */
export function badgeProgress(def: BadgeDef, stats: BadgeStats): { current: number; target: number } {
  return { current: Math.min(def.metric(stats), def.target), target: def.target }
}

/** 현재 통계로 획득 조건을 만족하는 뱃지 코드 목록 */
export function earnedBadgeCodes(stats: BadgeStats): BadgeCode[] {
  return BADGE_DEFS.filter((b) => isBadgeEarned(b, stats)).map((b) => b.code)
}
