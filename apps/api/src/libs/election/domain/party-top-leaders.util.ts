import { PrismaService } from '@prisma/prisma.service'
import { resolveCountryScopeOr } from '../../country/domain/country-scope.util'

/**
 * 정당 소속 국가(현대·역사)와 일치하는 재임 `where` — `person` 레포와 동일 규칙.
 * 정당에 `historicalCountryId`가 지정된 경우(단일 현대국과 매핑되어 `countryId`가 함께 채워진 경우 포함)
 * 해당 역사적 국가의 재임을 우선 조회하고, 현대 국가 단독 소속일 때만 브리지 스코프(resolveCountryScopeOr)를 사용한다.
 */
export async function buildTenureJurisdictionWhere(
  prisma: PrismaService,
  party: { countryId: string | null; historicalCountryId: string | null },
): Promise<Record<string, unknown> | null> {
  const { countryId, historicalCountryId } = party
  if (!countryId && !historicalCountryId) return null

  if (historicalCountryId) {
    return { historicalCountryId }
  }

  if (countryId) {
    return resolveCountryScopeOr(prisma, countryId)
  }

  return null
}

function tenureBoundTimestamp(
  date: Date | null | undefined,
  era: string | null | undefined,
  year: number | null | undefined,
  month: number | null | undefined,
  day: number | null | undefined,
  isEnd: boolean,
): number {
  if (date != null && era !== 'BC') {
    return date.getTime()
  }
  if (year != null) {
    const m = month ?? (isEnd ? 12 : 1)
    const d = day ?? (isEnd ? 28 : 1)
    const utc = new Date(Date.UTC(2000, m - 1, d))
    utc.setUTCFullYear(era === 'BC' ? -(year - 1) : year)
    return utc.getTime()
  }
  return isEnd ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY
}

export function membershipOverlapsTenure(
  m: { startDate: Date | null; endDate: Date | null },
  t: {
    startDate: Date | null
    endDate: Date | null
    startEra?: string | null
    startYear?: number | null
    startMonth?: number | null
    startDay?: number | null
    endEra?: string | null
    endYear?: number | null
    endMonth?: number | null
    endDay?: number | null
  },
): boolean {
  const ms = m.startDate?.getTime() ?? Number.NEGATIVE_INFINITY
  const me = m.endDate?.getTime() ?? Number.POSITIVE_INFINITY
  const ts = tenureBoundTimestamp(
    t.startDate,
    t.startEra,
    t.startYear,
    t.startMonth,
    t.startDay,
    false,
  )
  const te = tenureBoundTimestamp(
    t.endDate,
    t.endEra,
    t.endYear,
    t.endMonth,
    t.endDay,
    true,
  )
  return ms < te && me > ts
}
