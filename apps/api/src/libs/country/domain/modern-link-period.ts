import { Era } from '@prisma/client'

/**
 * 현대 국가 연결(`historical_country_modern_country`)의 기간 — "이 나라가 그 땅에 있었던 기간".
 *
 * 같은 나라가 땅을 옮긴 경우에만 채운다. 중화민국은 행 하나(헌법·총통 대수·국적이 이어짐)지만
 * 중국 연결은 1912-01~1949-12, 대만 연결은 1945-10~(현재)이다. 비어 있으면 존속 기간 전체.
 *
 * ⚠️ 표시·분류 전용이다. 스코프 합산(`country-scope.util.ts`)은 여전히 연결된 나라 **전부**를
 * 기간 무관하게 더한다 — 합산을 기간으로 자르려면 도메인마다 다른 날짜 칸을 다뤄야 해서 별도 작업이다.
 */
export interface ModernLinkPeriod {
  linkStartEra: Era | null
  linkStartYear: number | null
  linkStartMonth: number | null
  linkEndEra: Era | null
  linkEndYear: number | null
  linkEndMonth: number | null
}

/** 나라 자체의 존속 기간 (부호 없는 구조화 칸) */
export interface CountryLifespanFields {
  startEra: Era | null
  startYear: number | null
  startMonth: number | null
  endEra: Era | null
  endYear: number | null
  endMonth: number | null
}

/** 부호 연도(BC 음수, AD 양수). 미상은 null. */
export function toSignedYear(era: Era | string | null | undefined, year: number | null | undefined): number | null {
  if (year == null) return null
  return era === 'BC' ? -Math.abs(year) : Math.abs(year)
}

/**
 * 그 땅에서의 실제 기간(부호 연도) — 연결 기간이 있으면 그 칸을, 없으면 존속 기간을 쓴다.
 * 시작·끝을 따로 고른다: 연결 시작만 있는 행(대만 1945~)은 끝을 존속 기간(현재 진행)에서 받는다.
 */
export function effectiveSignedRange(item: CountryLifespanFields & Partial<ModernLinkPeriod>): {
  start: number | null
  end: number | null
} {
  const linkStart = toSignedYear(item.linkStartEra ?? 'AD', item.linkStartYear)
  const linkEnd = toSignedYear(item.linkEndEra ?? 'AD', item.linkEndYear)
  return {
    start: linkStart ?? toSignedYear(item.startEra, item.startYear),
    end: linkEnd ?? toSignedYear(item.endEra, item.endYear),
  }
}

/** 연결 행(prisma)에서 기간 칸만 뽑는다. 칸이 없는 옛 응답에도 null로 채운다. */
export function pickModernLinkPeriod(conn: Partial<{
  startEra: Era | null
  startYear: number | null
  startMonth: number | null
  endEra: Era | null
  endYear: number | null
  endMonth: number | null
}>): ModernLinkPeriod {
  return {
    linkStartEra: conn.startEra ?? null,
    linkStartYear: conn.startYear ?? null,
    linkStartMonth: conn.startMonth ?? null,
    linkEndEra: conn.endEra ?? null,
    linkEndYear: conn.endYear ?? null,
    linkEndMonth: conn.endMonth ?? null,
  }
}
