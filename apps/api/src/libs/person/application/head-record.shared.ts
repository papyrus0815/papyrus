/**
 * 수장급 재임·재위(head record) 읽기모델 공용 원시(primitive).
 *
 * 「동시대 수장」(person-contemporaries, 시간 겹침)과 「같은 국가 전/후 재위」
 * (person-reign-adjacency, 시간축 인접)가 **같은 규칙으로** 세야 하는 부분만
 * 여기 단일 출처로 둔다 — 두 화면이 다르게 세면 안 되는 것들:
 *
 * - `HEAD_POSITION_TYPES`: 수장급 판정(국가원수·정부수반). normalize-tenures와 동일.
 * - `utcYearStart`: `new Date(Date.UTC(y,...))`가 y<100을 19xx로 매핑하는 함정 회피.
 * - `effectiveEndYear`/`deathInfoOf`: 종료일 미입력(=「재임 중」과 구분 불가)을 사망
 *   연도/올해로 캡. 프론트 contemporary-heads-target.ts와도 규칙 동기화 필수.
 * - `RULER_PERSON_SELECT`: 표시명 조합·서양식 폴백·isOwned 판정에 필요한 최소 select.
 *
 * (검토서 docs/person-reign-neighbors-review.md §3.1 "공용 추출".)
 */

/** 수장 비교 타임라인과 동일 기준 — 국가원수·정부수반만 (normalize-tenures 참조) */
export const HEAD_POSITION_TYPES = ['HEAD_OF_STATE', 'HEAD_OF_GOVERNMENT'] as const

export function yearOf(date?: Date | null): number | null {
  return date ? date.getUTCFullYear() : null
}

/** Person 생몰 하이브리드(era 플래그 + 크기값 DATETIME) → 부호 연도 */
export function signedYearFromEraDate(
  era?: string | null,
  date?: Date | null,
): number | null {
  const year = yearOf(date)
  if (year == null) return null
  return era === 'BC' ? -year : year
}

/**
 * 수장급 기록의 시작/종료 연도(부호) — 구조화 축(era, year) 우선, DATETIME 폴백.
 *
 * SovereignReign은 BC·AD<1000을 startDate=NULL로 두고 startEra/startYear가 진실이므로
 * (era, structuredYear)를 먼저 읽는다(mapStructuredDateInput은 AD1000~9999만 DATETIME을 채움).
 * 구조화 값이 없으면(레거시 재위·구조화 컬럼이 없는 GovernmentPositionTenure) DATETIME에서
 * 유도한다 — DATETIME은 AD 전용이라 그 폴백의 부호는 항상 양수.
 */
export function signedYearFromStructuredOrDate(
  era: string | null | undefined,
  structuredYear: number | null | undefined,
  date: Date | null | undefined,
): number | null {
  if (structuredYear != null) return era === 'BC' ? -structuredYear : structuredYear
  return yearOf(date)
}

/**
 * 부호 연도 → 해당 연도 1월 1일 UTC.
 * `new Date(Date.UTC(y,...))`는 y<100을 19xx로 매핑하는 함정이 있어 setUTCFullYear로 강제.
 */
export function utcYearStart(year: number): Date {
  const date = new Date(Date.UTC(2000, 0, 1))
  date.setUTCFullYear(year)
  return date
}

export interface SubjectDeathInfo {
  deathSignedYear: number | null
  /** 사망 확정(또는 사망일 완전 미상)인데 연도가 없음 — 열린 종료를 시작 연도로 클램프 */
  deceasedWithUnknownDeathYear: boolean
}

/**
 * 종료일 없는 기록의 실효 종료 연도.
 * 「재임 중」과 「미입력」이 스키마상 구분 불가하므로 사망 연도로 캡한다 —
 * 캡이 없으면 종료일 미입력 과거 군주가 모든 창의 '동시대'로 등장한다.
 * (프론트 contemporary-heads-target.ts와 동일 규칙 — 양쪽이 어긋나면 안 됨)
 */
export function effectiveEndYear(params: {
  startYear: number
  endYear: number | null
  death: SubjectDeathInfo
  nowYear: number
}): number {
  const { startYear, endYear, death, nowYear } = params
  if (endYear != null) return Math.max(startYear, endYear)
  if (death.deathSignedYear != null) {
    return Math.max(startYear, Math.min(death.deathSignedYear, nowYear))
  }
  if (death.deceasedWithUnknownDeathYear) return startYear
  // 시작 클램프 필수 — 미래 시작일 오타(2062 등) 레코드가 음수 겹침·역전 창을 만들지 않게
  // (프론트 contemporary-heads-target.ts와 동일하게 모든 분기가 startYear 이상을 보장)
  return Math.max(startYear, nowYear)
}

export function deathInfoOf(person: {
  deathEra?: string | null
  deathDate?: Date | null
  isAlive?: boolean | null
  isDeathDateUnknown?: boolean | null
}): SubjectDeathInfo {
  const deathSignedYear = signedYearFromEraDate(person.deathEra, person.deathDate)
  return {
    deathSignedYear,
    deceasedWithUnknownDeathYear:
      deathSignedYear == null &&
      (person.isAlive === false || person.isDeathDateUnknown === true),
  }
}

/** 대상·이웃 수장 공용 인물 select — 표시명 조합(person-display-name)에 필요한 필드 포함 */
export const RULER_PERSON_SELECT = {
  id: true,
  name: true,
  surname: true,
  middleName: true,
  nameDisplayOrder: true,
  /** 서양식 이름 순서 폴백 — 개인 오버라이드 없으면 국가 기본이 결정 */
  country: { select: { defaultNameDisplayOrder: true } },
  profileImageUrl: true,
  templeName: true,
  regnalName: true,
  isAlive: true,
  isDeathDateUnknown: true,
  deathEra: true,
  deathDate: true,
  /** 소유 판정용 — 응답엔 isOwned로만 노출 (타계정 인물은 상세 진입 불가라 칩 비활성) */
  accountId: true,
} as const
