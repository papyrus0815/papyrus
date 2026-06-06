/**
 * 알림 preview(제목 아래 보조 문구) 생성 헬퍼.
 * 도메인마다 제각각이던 preview를 "연도/기간" 중심으로 통일하기 위한 공용 포맷터.
 * BC/고대 안전을 위해 Date는 네이티브 파싱 대신 ISO 문자열을 직접 자른다([[event-structured-bc-date]] 규칙).
 */

/** 연도 + 시대 라벨: BC면 "기원전 480", 그 외 "1789" */
function yearStr(era: string | null | undefined, year: number | null | undefined): string | null {
  if (year == null) return null
  return era === 'BC' ? `기원전 ${year}` : `${year}`
}

/**
 * 연도 범위 — 생몰년·존속기간 등. "1732 ~ 1799", 한쪽만 있으면 "1732 ~" / "~ 1799".
 * 둘 다 없으면 undefined.
 */
export function yearRangePreview(
  fromEra: string | null | undefined,
  fromYear: number | null | undefined,
  toEra: string | null | undefined,
  toYear: number | null | undefined,
): string | undefined {
  const a = yearStr(fromEra, fromYear)
  const b = yearStr(toEra, toYear)
  if (!a && !b) return undefined
  return `${a ?? ''} ~ ${b ?? ''}`.trim()
}

/** 단일 연도 라벨: "1789년" / "기원전 49년". 연도 없으면 undefined. */
export function yearPreview(
  era: string | null | undefined,
  year: number | null | undefined,
): string | undefined {
  const y = yearStr(era, year)
  return y ? `${y}년` : undefined
}

/**
 * Date(또는 ISO 문자열)에서 연도만 뽑아 범위 표기: "1945 ~ 1991" / "1945 ~".
 * 둘 다 없으면 undefined.
 */
export function dateYearRangePreview(
  start?: Date | string | null,
  end?: Date | string | null,
): string | undefined {
  const y = (v?: Date | string | null): string | null => {
    if (!v) return null
    const s = v instanceof Date ? v.toISOString() : String(v)
    const m = s.match(/^(-?\d{1,6})-/)
    return m ? `${Number(m[1])}` : null
  }
  const a = y(start)
  const b = y(end)
  if (!a && !b) return undefined
  return b ? `${a ?? ''} ~ ${b}`.trim() : `${a}`
}
