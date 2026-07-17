/**
 * 인물 통합 기록 비교 API (GET /person-records/compare) 래퍼.
 *
 * 연보·재임/재위·업적·사건참여·수상 5채널을 서버가 읽기 시점에 union해
 * 부호 연도(signed year, BC 음수)로 정규화해 내려준다 — 프론트에서 채널별
 * 날짜 재해석 금지(연도 정규화는 서버 독점 계약).
 *
 * 캐시 무효화는 `personRecordsKeys.all`(['person-records']) prefix 하나로 통일한다.
 * 기록을 바꾸는 mutation(연보 모달·재임/업적 등)은 이 prefix를 무효화할 것.
 */
import axios from 'axios'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  headers: {
    'Content-Type': 'application/json',
  },
  /** JWT 쿠키(access_token) 전달 — 연보 own-scope 판정에 필요 */
  withCredentials: true,
})

export type PersonRecordKind =
  | 'LIFE_EVENT'
  | 'TENURE'
  | 'REIGN'
  | 'ACHIEVEMENT'
  | 'EVENT'
  | 'AWARD'

export const PERSON_RECORD_KIND_LABEL: Record<PersonRecordKind, string> = {
  LIFE_EVENT: '연보',
  TENURE: '재임',
  REIGN: '재위',
  ACHIEVEMENT: '업적',
  EVENT: '사건',
  AWARD: '수상',
}

/** kind별 시각 구분 색 (라이트/다크 공통 계열 — 연보 카테고리 색과 별개 축) */
export const PERSON_RECORD_KIND_COLOR: Record<
  PersonRecordKind,
  { base: string; soft: string }
> = {
  LIFE_EVENT: { base: '#0ea5e9', soft: 'rgba(14,165,233,0.14)' },
  TENURE: { base: '#6366f1', soft: 'rgba(99,102,241,0.14)' },
  REIGN: { base: '#8b5cf6', soft: 'rgba(139,92,246,0.14)' },
  ACHIEVEMENT: { base: '#f59e0b', soft: 'rgba(245,158,11,0.14)' },
  EVENT: { base: '#dc2626', soft: 'rgba(220,38,38,0.14)' },
  AWARD: { base: '#10b981', soft: 'rgba(16,185,129,0.14)' },
}

export interface PersonRecordItem {
  kind: PersonRecordKind
  sourceId: string
  personId: string
  title: string
  /** plain text 200자 트림 (서버) */
  summary: string | null
  category: string | null
  /** 부호 연도 (BC 음수). 미상 null */
  startYear: number | null
  endYear: number | null
  /** 재임/재위 진행 중(종료일 없음) */
  ongoing: boolean
  startDate: string | null
  endDate: string | null
  precision: string | null
  /** 사건 정본 참조 — 여러 인물 기록이 같은 값이면 "공유 사건"으로 묶인다 */
  linkEventId: string | null
  countryName: string | null
  role: string | null
}

export interface PersonRecordsPerson {
  person: {
    id: string
    name: string
    surname: string | null
    middleName: string | null
    nameDisplayOrder: string | null
    birthYear: number | null
    deathYear: number | null
  }
  records: PersonRecordItem[]
  /** 기간 필터로 제외된 연도 미상 기록 수 — 0이 아니면 UI에 표기(무성 절단 금지) */
  undatedCount: number
}

export interface PersonRecordsCompareResponse {
  meta: {
    lifeEventScope: 'OWN_ACCOUNT_ONLY'
    fromYear: number | null
    /** 배타(exclusive) */
    toYear: number | null
    sources: PersonRecordKind[]
    missingPersonIds: string[]
  }
  persons: PersonRecordsPerson[]
}

export interface ComparePersonRecordsParams {
  /** 최대 12명 */
  personIds: string[]
  /** 부호 연도, 포함 */
  fromYear?: number | null
  /** 부호 연도, 배타(exclusive) */
  toYear?: number | null
  sources?: PersonRecordKind[]
}

export async function comparePersonRecords(
  params: ComparePersonRecordsParams,
): Promise<PersonRecordsCompareResponse> {
  const query = new URLSearchParams()
  query.set('personIds', params.personIds.join(','))
  if (params.fromYear != null) query.set('fromYear', String(params.fromYear))
  if (params.toYear != null) query.set('toYear', String(params.toYear))
  if (params.sources?.length) query.set('sources', params.sources.join(','))
  const response = await apiClient.get(
    `/person-records/compare?${query.toString()}`,
  )
  return response.data as PersonRecordsCompareResponse
}

/** react-query 키 — 무효화는 `all` prefix 하나로 */
export const personRecordsKeys = {
  all: ['person-records'] as const,
  compare: (params: ComparePersonRecordsParams) =>
    [
      'person-records',
      'compare',
      [...params.personIds].sort().join(','),
      params.fromYear ?? null,
      params.toYear ?? null,
      params.sources ? [...params.sources].sort().join(',') : null,
    ] as const,
}
