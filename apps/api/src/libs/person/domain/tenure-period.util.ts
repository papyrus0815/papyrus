/**
 * 재임(GovernmentPositionTenure)의 구조화 기간 칸 파생 — 직위 보유 단일 모델 이행 1단계.
 *
 * 지금은 입력이 여전히 DATETIME(startDate/endDate) + 시작일 정밀도라, 거기서 구조화 칸
 * (era·year·month·day)과 정렬 키를 만들어 함께 저장한다. 마이그레이션 백필
 * (20261017160027_tenure_unified_columns_stage1)과 같은 규칙이어야 한다:
 * - 날짜 부분은 UTC로 읽는다(Prisma가 DATETIME을 UTC로 저장 — 화면도 같은 날짜를 본다).
 * - 정밀도 'year'면 월·일을, 'month'면 일을 비운다.
 * - 종료일 정밀도 칸이 없어 시작일 정밀도를 따른다.
 * - 키 = 부호연도×10000 + 월×100 + 일. 빈 월·일은 시작이면 1월 1일, 끝이면 12월 31일.
 */

export interface TenurePeriodInput {
  startDate: Date
  startDatePrecision?: string | null
  endDate?: Date | null
}

export interface TenurePeriodColumns {
  startEra: 'AD' | 'BC'
  startYear: number
  startMonth: number | null
  startDay: number | null
  startKey: number
  endEra: 'AD' | 'BC' | null
  endYear: number | null
  endMonth: number | null
  endDay: number | null
  endKey: number | null
}

interface DateParts {
  era: 'AD' | 'BC'
  year: number
  month: number | null
  day: number | null
}

function partsOf(date: Date, precision: string | null | undefined): DateParts {
  const signedYear = date.getUTCFullYear()
  return {
    // DATETIME 경로는 AD만 들어오지만, 부호는 era로 옮겨 크기값 계약을 지킨다
    era: signedYear <= 0 ? 'BC' : 'AD',
    year: signedYear <= 0 ? 1 - signedYear : signedYear,
    month: precision === 'year' ? null : date.getUTCMonth() + 1,
    day: precision === 'year' || precision === 'month' ? null : date.getUTCDate(),
  }
}

export function periodKey(parts: DateParts, edge: 'start' | 'end'): number {
  const sign = parts.era === 'BC' ? -1 : 1
  const month = parts.month ?? (edge === 'start' ? 1 : 12)
  const day = parts.day ?? (edge === 'start' ? 1 : 31)
  return sign * parts.year * 10000 + month * 100 + day
}

export function tenurePeriodColumns(input: TenurePeriodInput): TenurePeriodColumns {
  const start = partsOf(input.startDate, input.startDatePrecision)
  const end = input.endDate ? partsOf(input.endDate, input.startDatePrecision) : null
  return {
    startEra: start.era,
    startYear: start.year,
    startMonth: start.month,
    startDay: start.day,
    startKey: periodKey(start, 'start'),
    endEra: end?.era ?? null,
    endYear: end?.year ?? null,
    endMonth: end?.month ?? null,
    endDay: end?.day ?? null,
    endKey: end ? periodKey(end, 'end') : null,
  }
}
