/**
 * PersonRegisterView 순수 헬퍼·옵션·타입.
 * 컴포넌트 본체에서 분리해 단일 파일 비대를 줄이고 단위 검증·재사용을 쉽게 함.
 */
import type { Era, SpouseRelationInput } from '@/shared/api/persons'
import type { PlaceResult } from '@/shared/ui/place-autocomplete/place-autocomplete'
import type { CountryAffiliationRow } from './sections/country-affiliations-section'

// ─── Options ──────────────────────────────────────────────────────────────────

export interface SegOption<T extends string> {
  value: T
  label: string
}

export const GENDER_OPTIONS: SegOption<string>[] = [
  { value: 'MALE', label: '남성' },
  { value: 'FEMALE', label: '여성' },
]

/** 필수 필드 에러 메시지 — blur·submit 검증이 동일 문구를 쓰도록 단일 정의. */
export const REQUIRED_MESSAGES = {
  name: '이름을 입력해주세요.',
  surname: '성을 입력해주세요.',
  gender: '성별을 선택해주세요.',
  countryId: '국적을 선택해주세요.',
} as const

/** 자주 사용하는 5개. 나머지는 "더보기"로 접기. */
export const PRIMARY_DEATH_TYPES: SegOption<string>[] = [
  { value: 'NATURAL', label: '자연사' },
  { value: 'ILLNESS', label: '병사' },
  { value: 'ASSASSINATION', label: '암살' },
  { value: 'BATTLE', label: '전사' },
  { value: 'ACCIDENT', label: '사고사' },
]
export const EXTRA_DEATH_TYPES: SegOption<string>[] = [
  { value: 'EXECUTION', label: '처형' },
  { value: 'SUICIDE', label: '자살' },
  { value: 'UNKNOWN', label: '불명' },
  { value: 'OTHER', label: '기타' },
]
export const DEATH_TYPE_OPTIONS: SegOption<string>[] = [
  ...PRIMARY_DEATH_TYPES,
  ...EXTRA_DEATH_TYPES,
]

/**
 * 사망 유형 카테고리 — 평면 행 13개를 그룹화해 한눈에 찾도록.
 * 자연 / 외부 / 자해 / 기타 4그룹. UI는 mini-header + 그룹 내 chip stack.
 */
export interface DeathTypeGroup {
  key: string
  label: string
  options: SegOption<string>[]
}

export const DEATH_TYPE_GROUPS: DeathTypeGroup[] = [
  {
    key: 'natural',
    label: '자연',
    options: [
      { value: 'NATURAL', label: '자연사' },
      { value: 'ILLNESS', label: '병사' },
    ],
  },
  {
    key: 'external',
    label: '외부 요인',
    options: [
      { value: 'ASSASSINATION', label: '암살' },
      { value: 'BATTLE', label: '전사' },
      { value: 'ACCIDENT', label: '사고사' },
      { value: 'EXECUTION', label: '처형' },
    ],
  },
  {
    key: 'self',
    label: '자해',
    options: [{ value: 'SUICIDE', label: '자살' }],
  },
  {
    key: 'other',
    label: '기타',
    options: [
      { value: 'UNKNOWN', label: '불명' },
      { value: 'OTHER', label: '기타' },
    ],
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const parseDateString = (date: string) => {
  const isBC = date.startsWith('-')
  const normalized = isBC ? date.slice(1) : date
  const [yearStr, monthStr, dayStr] = normalized.split('-')
  const year = parseInt(yearStr, 10)
  const month = parseInt(monthStr, 10)
  const day = parseInt(dayStr, 10)
  return { era: (isBC ? 'BC' : 'AD') as Era, year, month, day }
}

export const buildInitialDate = (
  era: Era,
  year?: string,
  month?: string,
  day?: string,
) => {
  if (!year) return undefined
  const y = parseInt(year, 10)
  if (isNaN(y)) return undefined
  const m = month ? parseInt(month, 10) : 1
  const d = day ? parseInt(day, 10) : 1
  const yearStr = Math.abs(y).toString().padStart(4, '0')
  const monthStr = String(m).padStart(2, '0')
  const dayStr = String(d).padStart(2, '0')
  return `${era === 'BC' ? '-' : ''}${yearStr}-${monthStr}-${dayStr}`
}

export const formatDateDisplay = (
  era: Era,
  y: string,
  m: string,
  d: string,
) => {
  if (!y.trim()) return '날짜 선택'
  const year = parseInt(y, 10)
  if (isNaN(year)) return '날짜 선택'
  const prefix = era === 'BC' ? `BC ${year}` : `${year}년`
  const month = m ? parseInt(m, 10) : null
  const day = d ? parseInt(d, 10) : null
  if (month && day) return `${prefix} ${month}월 ${day}일`
  if (month) return `${prefix} ${month}월`
  return prefix
}

/**
 * 출생/사망 날짜로 향년 계산.
 * - 0년이 없는 역사 통념: BC 1 → AD 1은 만 1세, BC 1 → AD 2 = 만 2세.
 *   → 부호가 다른 경우 단순 차이에서 1을 빼야 정확.
 * - 월·일이 있으면 사망 시점이 생일 전인지 비교해 만 나이로 보정.
 * - 둘 중 하나라도 미상이거나 미입력이면 null.
 */
export function calcLifespan(
  birth: { era: Era; year: number; month?: number; day?: number } | null,
  death: { era: Era; year: number; month?: number; day?: number } | null,
): number | null {
  if (!birth || !death) return null
  const by = birth.era === 'BC' ? -birth.year : birth.year
  const dy = death.era === 'BC' ? -death.year : death.year
  let age = dy - by
  // 부호가 달라 0년을 건너뛴 만큼(=1년) 보정. 둘 다 같은 era이면 보정 불필요.
  if (birth.era !== death.era) age -= 1
  // 실제 생일 전이면 만 나이 -1
  const bm = birth.month
  const dm = death.month
  if (bm && dm) {
    if (dm < bm) age -= 1
    else if (dm === bm) {
      const bd = birth.day
      const dd = death.day
      if (bd && dd && dd < bd) age -= 1
    }
  }
  if (age < 0) return null
  return age
}

/**
 * 절대 시각을 "방금 / N분 전 / 오후 3:42" 같은 상대 시간으로 표시.
 * 1시간 이내는 분 단위, 오늘은 시각, 어제 이상은 날짜 + 시각.
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour
  if (diff < 30 * 1000) return '방금'
  if (diff < hour) {
    const m = Math.floor(diff / minute)
    return `${m}분 전`
  }
  const date = new Date(timestamp)
  if (diff < day) {
    return `오늘 ${date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`
  }
  if (diff < 2 * day) {
    return `어제 ${date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`
  }
  return date.toLocaleString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ─── Draft 직렬화 타입 ────────────────────────────────────────────────────────

export interface PersonDraftSnapshot extends Record<string, unknown> {
  name: string
  surname: string
  middleName: string
  nameFormat: 'auto' | 'korean' | 'western'
  originalName: string
  surnameMeaning: string
  nameMeaning: string
  middleNameMeaning: string
  gender: string
  isBirthDateUnknown: boolean
  birthEra: Era
  birthYear: string
  birthMonth: string
  birthDay: string
  isDeathDateUnknown: boolean
  isAlive: boolean
  deathEra: Era
  deathType: string
  deathCause: string
  deathNote: string
  deathYear: string
  deathMonth: string
  deathDay: string
  countryId: string
  countryAffiliations: CountryAffiliationRow[]
  birthCityId: string
  deathCityId: string
  birthPlace: PlaceResult | null
  deathPlace: PlaceResult | null
  dynastyId: string
  religionId: string
  fatherId: string
  motherId: string
  illegitimate: boolean
  spouseRelations: SpouseRelationInput[]
  profileImageUrl: string
  regnalName: string
  templeName: string
  posthumousName: string
}
