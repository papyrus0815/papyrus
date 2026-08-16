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
import {
  APPOINTMENT_METHOD_LABELS,
  TENURE_END_REASON_LABELS,
} from '@/shared/lib/tenure-labels'

export { APPOINTMENT_METHOD_LABELS, TENURE_END_REASON_LABELS }

/** 기록 종류 — 종료 사유 라벨의 목소리를 가른다 (재위/작위/공직) */
export type TenureFamily = 'reign' | 'noble' | 'office'

/**
 * 종료 사유 enum 라벨의 종류별 변형 — **표시층 전용**.
 *
 * 공유 맵 TENURE_END_REASON_LABELS는 재임(공직) 목소리로 쓰여 있어, 재위 행이
 * "퇴위 / 재임 중 사망"이라는 어긋난 조합으로 나온다(실DB sovereign_reign 다수).
 * dt(즉위/퇴위)만 종류별로 갈리고 값은 안 갈리던 비대칭을 여기서 메운다.
 *
 * ⚠️ 스키마·enum 값·등록 폼(TENURE_END_REASON_OPTIONS)은 무변경 — 상세는 '재위 중 사망',
 *    수정 모달 셀렉트는 '재임 중 사망'으로 보이는 비대칭이 의도된 것임을 여기 남긴다.
 */
const END_REASON_KIND_OVERRIDE: Record<
  'reign' | 'noble',
  Record<string, string>
> = {
  reign: { DEATH_IN_OFFICE: '재위 중 사망' },
  noble: { DEATH_IN_OFFICE: '보유 중 사망', REMOVAL: '작위 박탈' },
}

export function endReasonLabelFor(reason: string, family: TenureFamily): string {
  if (family !== 'office') {
    const override = END_REASON_KIND_OVERRIDE[family][reason]
    if (override) return override
  }
  return TENURE_END_REASON_LABELS[reason] ?? reason
}

/**
 * 재임·재위 '길이' 파생 — 기간 옆에 "약 3년" 식으로 붙는다.
 * 비고에 손으로 다시 쓰던 '약 N년 재임'의 존재 이유를 없애는 것이 목적.
 *
 * ⚠️ 시그니처 규약: 완성된 한국어 문자열(rangeLabel·endLabel·deathDateStr)을 **받지 않는다**.
 *    표시 문자열 파싱 금지를 주석이 아니라 타입으로 강제한다 — 앞으로의 기간 파생도 이 규약을 따를 것.
 * ⚠️ fail-quiet: 재임 테이블에는 구조화 연도 컬럼이 없고 DATETIME뿐이며, mariadb가
 *    연도<100 DATETIME을 손상시킨 이력이 있다 → 양 끝점이 AD 1000+ 일 때만 표시한다.
 *    (근사가 틀리게 보이느니 안 보이는 편이 낫다)
 */
export function deriveTenureDurationLabel(
  startDate?: string | null,
  endDate?: string | null,
  startDatePrecision?: string | null,
): string | null {
  const start = parseIsoDateParts(startDate)
  const end = parseIsoDateParts(endDate)
  if (!start || !end) return null
  if (start.era !== 'AD' || end.era !== 'AD') return null
  if (start.year < 1000 || end.year < 1000) return null
  const months = end.year * 12 + end.month - (start.year * 12 + start.month)
  // 0개월(같은 달) · 100년 초과(데이터 오류)는 표시하지 않는다
  if (months < 1 || months > 1200) return null
  const years = Math.floor(months / 12)
  const restMonths = months % 12
  if (years < 1) return `약 ${restMonths}개월`
  if (startDatePrecision === 'year' || restMonths === 0) return `약 ${years}년`
  return `약 ${years}년 ${restMonths}개월`
}

/**
 * era 플래그(BC/AD) + 크기 연도 → 천문 연도(부호). BC N년 = 1−N
 * (BC 1년→0, AD 1년→1). 나이·기간 차 계산에 쓰면 BC/AD 경계의
 * "0년 없음"이 자동 보정된다. era 미상은 AD로 간주.
 */
export function astroYearFromEra(
  year: number | null | undefined,
  era?: string | null,
): number | null {
  if (year == null) return null
  return era === 'BC' ? 1 - year : year
}

/**
 * 출생~사망 향년(만 나이 근사, era 안전). 연 단위 — 월·일 정밀 보정은 생략.
 * 한쪽이라도 연도 미상이면 null, 음수(데이터 오류)면 null.
 */
export function ageBetweenYears(
  birthYear: number | null | undefined,
  birthEra: string | null | undefined,
  deathYear: number | null | undefined,
  deathEra: string | null | undefined,
): number | null {
  const birthAstro = astroYearFromEra(birthYear, birthEra)
  const deathAstro = astroYearFromEra(deathYear, deathEra)
  if (birthAstro == null || deathAstro == null) return null
  const age = deathAstro - birthAstro
  return age >= 0 ? age : null
}

/**
 * 특정 시점에 몇 살이었는지 계산 (출생년월일 + 해당 날짜)
 * 출생 정보 없으면 null.
 * birthEra·대상 날짜 era를 모두 천문 연도로 환산해 BC 출생·BC 시점·BC→AD 교차를
 * 모두 올바르게 계산한다(birthEra 미지정이면 AD 가정 — 기존 호출부 호환).
 */
export function getAgeAtDate(
  birthYear: number | null | undefined,
  birthMonth?: number | null,
  birthDay?: number | null,
  dateIso?: string | null,
  birthEra?: string | null,
): number | null {
  if (birthYear == null) return null
  const p = parseIsoDateParts(dateIso)
  if (!p) return null
  const birthAstro = birthEra === 'BC' ? 1 - birthYear : birthYear
  const dateAstro = p.era === 'BC' ? 1 - p.year : p.year
  let age = dateAstro - birthAstro
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
 * - end 만 있으면 `~ ${end}` (기간 종료만 아는 관계 — 단독 날짜로 오독되지 않게 '~' 접두)
 * - 둘 다 없으면 null
 *
 * ongoingLabel: 진행 중 구간의 끝 표기. 사망자에게는 '미상'을 넘겨(재임·재위 규약과 통일)
 * 종료일 미입력이 '현재/재학중'으로 둔갑하지 않게 한다.
 */
export function formatPeriod(
  start: string | null | undefined,
  end: string | null | undefined,
  ongoingLabel = '현재',
): string | null {
  if (start && end) return `${start} ~ ${end}`
  if (start) return `${start} ~ ${ongoingLabel}`
  if (end) return `~ ${end}`
  return null
}

export interface TenurePeriodInput {
  startDate?: string | null
  /** 'year'면 시작을 연 단위로만 표기(월·일 관행 채움값 숨김) */
  startDatePrecision?: string | null
  endDate?: string | null
  /** 종료 사유 enum — 있으면 종료일 미상이어도 '미상'(진행 중 아님)으로 확정 */
  endReason?: string | null
  /** 고인 여부 — 종료일·종료사유 없어도 '현재'로 둔갑하지 않게 '미상' */
  isDeceased?: boolean
  /** 재직 중 사망(DEATH_IN_OFFICE) 시 종료일 폴백으로 쓸 이미 포맷된 사망일 문자열 */
  deathDateStr?: string | null
}

export interface TenurePeriodLabel {
  /** 시작 표기 — 연 정밀도면 "N년"(BC면 "기원전 N년"), 아니면 "YYYY년 M월 D일" */
  startStr: string
  /** 시작이 연 정밀도만인지 — 나이 배지 '경' 접미 게이트 */
  startYearOnly: boolean
  /** 종료 표기 — 종료일 ?? (재직중사망→사망일, 종료사유·고인→'미상', 그 외 '현재') */
  endLabel: string
  /** 종료일이 실제 존재하는지 — age-at-end 계산·en대시 게이트 */
  hasEndDate: boolean
  /** "start – end" 결합 표기(카드 칩·타임라인 dateLabel 공용). 시작 미상이면 "? – end". */
  rangeLabel: string
}

/**
 * 재임·재위 기간 라벨 파생 — 개요 카드와 연보 타임라인이 각자 구현하던 종료일·정밀도·
 * 재직중사망·미상/현재 폴백을 한 곳으로 모아 표기 드리프트를 없앤다(단일 출처).
 * 모든 날짜 파싱은 BC-safe(parseIsoDateParts/formatIsoDateKo) — `new Date()`는 BC 음수
 * 연도와 고대 AD를 오파싱하므로 쓰지 않는다.
 */
export function deriveTenurePeriodLabel(
  input: TenurePeriodInput,
): TenurePeriodLabel {
  const precision = input.startDatePrecision
  // '경'(약) 접미 게이트는 연 단위 정밀도에만 (월 정밀도는 월까지 표기해 근사 아님)
  const startYearOnly = precision === 'year' && !!input.startDate
  const startParts = parseIsoDateParts(input.startDate)
  let startStr: string
  if (startParts && (precision === 'year' || precision === 'month')) {
    const bc = startParts.era === 'BC' ? '기원전 ' : ''
    startStr =
      precision === 'year'
        ? `${bc}${startParts.year}년`
        : `${bc}${startParts.year}년 ${startParts.month}월`
  } else {
    startStr = formatIsoDateKo(input.startDate)
  }
  const endStr = input.endDate ? formatIsoDateKo(input.endDate) : ''
  const endLabel =
    endStr ||
    (input.endReason === 'DEATH_IN_OFFICE' && input.deathDateStr
      ? input.deathDateStr
      : input.endReason || input.isDeceased
        ? '미상'
        : '현재')
  const hasEndDate = !!endStr
  const rangeLabel = startStr
    ? `${startStr} – ${endLabel}`
    : hasEndDate
      ? `? – ${endLabel}`
      : ''
  return { startStr, startYearOnly, endLabel, hasEndDate, rangeLabel }
}
