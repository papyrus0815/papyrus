/**
 * 재임(GovernmentPositionTenure)의 기간 칸 — 구조화 칸(era·year·month·day)이 정본이고
 * DATETIME·시작 정밀도·정렬 키는 파생이다. DB 트리거(trg_tenure_period_derive_*, 마이그 20261023051000)가
 * 같은 규칙으로 다시 맞추므로 여기와 트리거가 어긋나면 안 된다.
 *
 * - 키 = 부호연도×10000 + 월×100 + 일. 빈 월·일은 시작이면 1월 1일, 끝이면 12월 31일.
 * - DATETIME = UTC 자정, AD 1000~9999만(그 밖은 NULL). 시작 정밀도 = 'year' | 'month' | NULL(일 단위).
 */

export function periodKey(parts: PeriodEdge, edge: 'start' | 'end'): number {
  const sign = parts.era === 'BC' ? -1 : 1
  const month = parts.month ?? (edge === 'start' ? 1 : 12)
  const day = parts.day ?? (edge === 'start' ? 1 : 31)
  return sign * parts.year * 10000 + month * 100 + day
}

/** 한쪽 끝(시작/종료)의 구조화 값 — 칸이 비면 그 끝을 모른다(종료면 재임 중) */
export interface PeriodEdge {
  era: 'AD' | 'BC'
  year: number
  month: number | null
  day: number | null
}

/**
 * 재위 입력 두 채널을 구조화 끝값으로 — 직위 보유 단일 모델 이행 2단계(재위 쓰기 → 재임 테이블).
 * - 구조화(startDateInfo: era·year·month·day)가 오면 그것이 진실(BC·고대 포함).
 * - 레거시(ISO 문자열 + 정밀도)면 문자열을 직접 파싱(new Date 금지 — BC 둔갑)하고 정밀도로 자른다.
 */
export function edgeFromInput(
  structured: { era: 'BC' | 'AD'; year: number; month?: number | null; day?: number | null } | null | undefined,
  legacyIso: string | null | undefined,
  legacyPrecision: string | null | undefined,
): PeriodEdge | null {
  if (structured) {
    const month = structured.month ?? null
    return { era: structured.era, year: structured.year, month, day: month == null ? null : (structured.day ?? null) }
  }
  if (!legacyIso) return null
  const negative = legacyIso.startsWith('-')
  const match = (negative ? legacyIso.slice(1) : legacyIso).match(/^(\d{1,6})(?:-(\d{1,2}))?(?:-(\d{1,2}))?/)
  if (!match || !parseInt(match[1], 10)) return null
  const month = legacyPrecision === 'year' || !match[2] ? null : parseInt(match[2], 10)
  const day =
    month == null || legacyPrecision === 'month' || !match[3] ? null : parseInt(match[3], 10)
  return { era: negative ? 'BC' : 'AD', year: parseInt(match[1], 10), month, day }
}

/** 끝값을 정밀도로 자른다 — 'year'면 월·일, 'month'면 일을 비운다(정밀도를 늘릴 수는 없다) */
export function truncateEdge(edge: PeriodEdge, precision: string | null | undefined): PeriodEdge {
  if (precision === 'year') return { ...edge, month: null, day: null }
  if (precision === 'month') return { ...edge, day: null }
  return edge
}

/** DB 칸 묶음 — 구조화 끝값 + 키 + 파생 DATETIME(AD 1000~9999만, 그 밖은 NULL) */
export function periodColumnsFromEdges(start: PeriodEdge | null, end: PeriodEdge | null) {
  const toDate = (edge: PeriodEdge | null) => {
    if (!edge || edge.era !== 'AD' || edge.year < 1000 || edge.year > 9999) return null
    return new Date(Date.UTC(edge.year, (edge.month ?? 1) - 1, edge.day ?? 1))
  }
  const precision = (edge: PeriodEdge | null) =>
    !edge ? null : edge.month == null ? 'year' : edge.day == null ? 'month' : null
  return {
    startEra: start?.era ?? null,
    startYear: start?.year ?? null,
    startMonth: start?.month ?? null,
    startDay: start?.day ?? null,
    startKey: start ? periodKey(start, 'start') : null,
    startDate: toDate(start),
    // 재임의 옛 규약: 정밀도 NULL = 일 단위
    startDatePrecision: precision(start),
    endEra: end?.era ?? null,
    endYear: end?.year ?? null,
    endMonth: end?.month ?? null,
    endDay: end?.day ?? null,
    endKey: end ? periodKey(end, 'end') : null,
    endDate: toDate(end),
  }
}
