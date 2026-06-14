import type { PersonDetailData, TenureLikeRecord } from './types'

/**
 * 재임 목록 통합 접근자. detail 엔드포인트는 `governmentPositions`,
 * 그 외 엔드포인트·DTO 는 `governmentTenures` 로 같은 데이터를 다른 이름으로
 * 내려준다. 호출부에서 `?? ` 분기를 흩뿌리지 않도록 한 곳으로 모은다.
 */
export function pickGovernmentTenures(
  person:
    | Pick<PersonDetailData, 'governmentPositions' | 'governmentTenures'>
    | null
    | undefined,
): TenureLikeRecord[] {
  return (person?.governmentPositions ?? person?.governmentTenures ?? []) as TenureLikeRecord[]
}

/** "YYYY년 M월 D일" 형식 (월·일 없으면 년만) */
export function formatDateKo(
  year: number | null | undefined,
  month?: number | null,
  day?: number | null,
  era?: string | null,
): string {
  if (year == null) return ''
  const prefix = era === 'BC' ? '기원전 ' : ''
  if (month != null && day != null)
    return `${prefix}${year}년 ${month}월 ${day}일`
  if (month != null) return `${prefix}${year}년 ${month}월`
  return `${prefix}${year}년`
}

/**
 * ISO/날짜 문자열을 era·year·month·day로 직접 파싱 (BC·고대 안전).
 *
 * `new Date()` 를 쓰지 않는 이유:
 *  1) BC: 백엔드가 보내는 `-0221-...` 같은 4자리 음수 연도는 ISO 확장표기가
 *     아니라서 `new Date()` 가 부호를 떼고 AD 221로 잘못 파싱한다.
 *  2) 고대 AD: `new Date('0918-01-01')` 는 UTC 자정으로 파싱한 뒤 getFullYear()
 *     를 로컬 타임존으로 환산하면서 917년으로 1 어긋난다(타임존 오프셋).
 * 문자열의 날짜부(UTC 기준 저장값)를 그대로 읽어 두 문제를 모두 피한다.
 */
export function parseIsoDateParts(
  iso: string | null | undefined,
): { era: 'BC' | 'AD'; year: number; month: number; day: number } | null {
  if (!iso) return null
  const neg = iso.startsWith('-')
  const body = neg ? iso.slice(1) : iso
  const m = body.match(/^(\d{1,6})-(\d{1,2})-(\d{1,2})/)
  if (!m) return null
  return {
    era: neg ? 'BC' : 'AD',
    year: parseInt(m[1], 10),
    month: parseInt(m[2], 10),
    day: parseInt(m[3], 10),
  }
}

/** ISO 날짜 문자열 → "YYYY년 M월 D일" (BC면 "기원전 N년 …") */
export function formatIsoDateKo(iso: string | null | undefined): string {
  const p = parseIsoDateParts(iso)
  if (!p) return ''
  const prefix = p.era === 'BC' ? '기원전 ' : ''
  return `${prefix}${p.year}년 ${p.month}월 ${p.day}일`
}

/**
 * ISO 날짜 문자열 → 정렬용 단조 증가 숫자 키.
 * BC는 음수( 큰 연도일수록 더 과거 = 더 작은 값 ), 파싱 불가/없음은 +Infinity(맨 뒤).
 */
export function isoDateSortKey(iso: string | null | undefined): number {
  const p = parseIsoDateParts(iso)
  if (!p) return Number.POSITIVE_INFINITY
  const mag = p.year * 10000 + p.month * 100 + p.day
  return p.era === 'BC' ? -mag : mag
}

/**
 * ISO 날짜 문자열 → 부호 있는 근사 일수(day count). 구간 길이 합산(KPI)용.
 * BC/AD 경계를 포함해 연속적이며, 연 단위로 반올림하는 용도라 근사로 충분하다.
 * (천문 연도: BC N년 = 1 − N → BC 1년이 0, AD 1년이 1)
 */
export function isoDateToApproxDays(iso: string | null | undefined): number | null {
  const p = parseIsoDateParts(iso)
  if (!p) return null
  const astroYear = p.era === 'BC' ? 1 - p.year : p.year
  return astroYear * 365.25 + (p.month - 1) * 30.4375 + p.day
}

/**
 * 인물 상세 업적 목록 정렬 비교자 — orderNum 오름차순, 동률이면 startDate 문자열 비교.
 *
 * 행정부 타임라인의 `compareTenureAchievementsChronological`는 startDate만 보고 정렬한다.
 * 두 화면의 정렬 기준이 다른 것은 *의도된 차이*이므로, 렌더러를 통합할 때
 * variant별로 이 차이를 보존해야 한다. (achievement-renderers-divergence.spec.ts 참고)
 */
export function compareTenureAchievementsByOrder(
  left: { orderNum?: number | null; startDate?: string | null },
  right: { orderNum?: number | null; startDate?: string | null },
): number {
  const leftOrder = left.orderNum ?? 0
  const rightOrder = right.orderNum ?? 0
  if (leftOrder !== rightOrder) return leftOrder - rightOrder
  return (left.startDate ?? '').localeCompare(right.startDate ?? '')
}

/** 사망 유형 enum → 한국어 라벨 */
export const DEATH_TYPE_LABELS: Record<string, string> = {
  NATURAL: '자연사',
  ILLNESS: '병사',
  ASSASSINATION: '암살',
  EXECUTION: '처형',
  BATTLE: '전사',
  ACCIDENT: '사고사',
  SUICIDE: '자살',
  UNKNOWN: '불명',
  OTHER: '기타',
}

// 취임/즉위 방식·종료 사유 라벨은 등록 폼과 공유 (단일 출처)
export {
  APPOINTMENT_METHOD_LABELS,
  TENURE_END_REASON_LABELS,
} from '@/shared/lib/tenure-labels'

/**
 * 특정 시점에 몇 살이었는지 계산 (출생년월일 + 해당 날짜)
 * 출생 정보 없으면 null
 */
export function getAgeAtDate(
  birthYear: number | null | undefined,
  birthMonth?: number | null,
  birthDay?: number | null,
  dateIso?: string | null,
): number | null {
  if (birthYear == null) return null
  const p = parseIsoDateParts(dateIso)
  // 출생 era 를 받지 않으므로 birthYear 는 AD 로 가정한다.
  // 대상 날짜가 BC면 AD 출생연도와의 나이 계산이 불가능 → null.
  if (!p || p.era === 'BC') return null
  let age = p.year - birthYear
  if (age < 0) return null
  if (birthMonth != null && birthDay != null) {
    if (p.month < birthMonth || (p.month === birthMonth && p.day < birthDay)) age--
  }
  return age
}

/**
 * 기간 문자열 포맷터. start/end 는 이미 포맷된 문자열(예: formatIsoDateKo 결과)를 받는다.
 * - start & end 모두 있으면 `${start} ~ ${end}`
 * - start 만 있으면 `${start} ~ ${ongoingLabel}` (기본 '현재')
 * - start 가 없으면 null
 */
export function formatPeriod(
  start: string | null | undefined,
  end: string | null | undefined,
  ongoingLabel = '현재',
): string | null {
  if (start && end) return `${start} ~ ${end}`
  if (start) return `${start} ~ ${ongoingLabel}`
  return null
}
