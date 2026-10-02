import { BadRequestException } from '@nestjs/common'

/**
 * 구조화 시점 — 측정값의 시점·구간 끝.
 *
 * Observation은 DATETIME을 두지 않는다. 레포 규약상 DATETIME은 AD1000+ 완전일자만 안전하고
 * (mariadb 어댑터가 서기 1~99년을 20xx로 읽던 문제, BC 문자열 파싱 둔갑), 측정값의 시점은
 * '1453년'·'기원전 216년 8월'처럼 연·월 정밀도가 흔하다. 그래서 정수 4칸 + 파생 정밀도가 전부다.
 *
 * - year는 **크기값(양수)**, BC/AD는 era로 구분한다(Event·SovereignReign과 같은 계약).
 * - precision은 입력받지 않고 **채워진 칸에서 파생**한다 — 입력과 정밀도가 어긋날 방법을 없앤다.
 */
export interface StructuredPointInput {
  era: 'BC' | 'AD'
  year: number
  month?: number | null
  day?: number | null
}

export type PointPrecision = 'year' | 'month' | 'day'

export interface StructuredPoint {
  era: 'BC' | 'AD'
  year: number
  month: number | null
  day: number | null
  precision: PointPrecision
}

/** 저장 칼럼 4+1개 — start·end 접두는 호출자가 붙인다 */
export interface StructuredPointColumns {
  era: 'BC' | 'AD' | null
  year: number | null
  month: number | null
  day: number | null
  precision: PointPrecision | null
}

const EMPTY_COLUMNS: StructuredPointColumns = {
  era: null,
  year: null,
  month: null,
  day: null,
  precision: null,
}

function daysInMonth(signedYear: number, month: number): number {
  if (month === 2) {
    // 역산 그레고리력 — 표시·검증용. BC는 천문 연도(1 BC = 0)로 윤년 판정
    const astronomical = signedYear < 0 ? signedYear + 1 : signedYear
    const leap =
      (astronomical % 4 === 0 && astronomical % 100 !== 0) || astronomical % 400 === 0
    return leap ? 29 : 28
  }
  return [4, 6, 9, 11].includes(month) ? 30 : 31
}

/** 입력 → 검증된 시점. 잘못된 조합은 400 */
export function normalizePoint(
  input: StructuredPointInput,
  label: string,
): StructuredPoint {
  if (input.era !== 'BC' && input.era !== 'AD') {
    throw new BadRequestException(`${label}: era는 BC 또는 AD여야 합니다`)
  }
  if (!Number.isInteger(input.year) || input.year < 1 || input.year > 9999) {
    throw new BadRequestException(`${label}: year는 1~9999의 양의 정수입니다(BC는 era로 구분)`)
  }
  const month = input.month ?? null
  const day = input.day ?? null
  if (day != null && month == null) {
    throw new BadRequestException(`${label}: 일(day)만 있고 월(month)이 없습니다`)
  }
  if (month != null && (!Number.isInteger(month) || month < 1 || month > 12)) {
    throw new BadRequestException(`${label}: month는 1~12입니다`)
  }
  if (day != null) {
    const signedYear = input.era === 'BC' ? -input.year : input.year
    const maxDay = daysInMonth(signedYear, month!)
    if (!Number.isInteger(day) || day < 1 || day > maxDay) {
      throw new BadRequestException(`${label}: day는 1~${maxDay}입니다`)
    }
  }
  return {
    era: input.era,
    year: input.year,
    month,
    day,
    precision: day != null ? 'day' : month != null ? 'month' : 'year',
  }
}

export function pointToColumns(point: StructuredPoint | null): StructuredPointColumns {
  if (!point) return EMPTY_COLUMNS
  return {
    era: point.era,
    year: point.year,
    month: point.month,
    day: point.day,
    precision: point.precision,
  }
}

export function columnsToPoint(columns: {
  era: 'BC' | 'AD' | null
  year: number | null
  month: number | null
  day: number | null
}): StructuredPoint | null {
  if (columns.era == null || columns.year == null) return null
  return {
    era: columns.era,
    year: columns.year,
    month: columns.month,
    day: columns.day,
    precision: columns.day != null ? 'day' : columns.month != null ? 'month' : 'year',
  }
}

/**
 * 시간순 비교 키 — 구간의 **이른 쪽 끝**(정밀도가 낮으면 그 연·월의 첫날).
 * BC는 음수 연도. 문자열 비교·Date 생성 없이 정수만 쓴다.
 */
export function pointSortKey(point: StructuredPoint): number {
  const signedYear = point.era === 'BC' ? -point.year : point.year
  return signedYear * 10_000 + (point.month ?? 1) * 100 + (point.day ?? 1)
}

/** 구간 검증 — 끝이 시작보다 이르면 400. 같은 시점은 허용(하루짜리 구간) */
export function assertPointOrder(
  start: StructuredPoint | null,
  end: StructuredPoint | null,
): void {
  if (!end) return
  if (!start) {
    throw new BadRequestException('구간 끝(end)만 있고 시작(start)이 없습니다')
  }
  if (pointSortKey(end) < pointSortKey(start)) {
    throw new BadRequestException('구간 끝(end)이 시작(start)보다 이릅니다')
  }
}

/**
 * 레거시 DATETIME 칸에 함께 쓸 값 — **AD 1000~9999의 완전한 날짜만**.
 * 그 밖(BC·서기 1~999·연/월 정밀도)은 NULL. 구조화 칸이 진실이고 DATETIME은 하위 호환용 사본이다.
 * (mariadb 어댑터가 1~99년을 20xx로 읽고, 1000년 이전은 TZ 드리프트로 하루가 밀린다.)
 */
export function pointToLegacyDateTime(point: StructuredPoint | null): Date | null {
  if (!point || point.era !== 'AD' || point.year < 1000 || point.precision !== 'day') return null
  return new Date(Date.UTC(point.year, point.month! - 1, point.day!))
}

/**
 * 레거시 ISO 입력('1870-07-19' · '1870-07-19T00:00:00Z' · '-0044-03-15') → 시점.
 * `new Date(iso)`를 쓰지 않는다 — BC 문자열이 AD로 둔갑하고 두 자리 연도가 19xx로 읽힌다.
 */
export function parseLegacyIsoPoint(iso: string, label: string): StructuredPoint {
  const match = /^(-?)(\d{1,6})-(\d{2})-(\d{2})/.exec(iso.trim())
  if (!match) throw new BadRequestException(`${label}: 날짜 형식이 아닙니다 (${iso})`)
  const negative = match[1] === '-'
  const rawYear = Number(match[2])
  // ISO 8601 확장 연도: -0044 = BC 45 (천문 연도 0 = BC 1)
  const era: 'BC' | 'AD' = negative || rawYear === 0 ? 'BC' : 'AD'
  const year = era === 'BC' ? rawYear + 1 : rawYear
  return normalizePoint({ era, year, month: Number(match[3]), day: Number(match[4]) }, label)
}
