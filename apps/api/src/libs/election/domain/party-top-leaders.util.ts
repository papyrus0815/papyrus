import { PrismaService } from '@prisma/prisma.service'

/** 정당 소속 국가(현대·역사)와 일치하는 재임 `where` — `person` 레포와 동일 규칙 */
export async function buildTenureJurisdictionWhere(
  prisma: PrismaService,
  party: { countryId: string | null; historicalCountryId: string | null },
): Promise<Record<string, unknown> | null> {
  const { countryId, historicalCountryId } = party
  if (!countryId && !historicalCountryId) return null

  if (historicalCountryId && !countryId) {
    return { historicalCountryId }
  }

  if (countryId) {
    const linkedHistoricalIds = await prisma.historicalCountryModernCountry
      .findMany({
        where: { modernCountryId: countryId },
        select: { historicalCountryId: true },
      })
      .then((rows) => rows.map((r) => r.historicalCountryId))
    if (linkedHistoricalIds.length > 0) {
      return {
        OR: [
          { countryId },
          { historicalCountryId: { in: linkedHistoricalIds } },
        ],
      }
    }
    return { countryId }
  }

  return null
}

export function membershipOverlapsTenure(
  m: { startDate: Date | null; endDate: Date | null },
  t: { startDate: Date; endDate: Date | null },
): boolean {
  const ms = m.startDate?.getTime() ?? Number.NEGATIVE_INFINITY
  const me = m.endDate?.getTime() ?? Number.POSITIVE_INFINITY
  const ts = t.startDate.getTime()
  const te = t.endDate?.getTime() ?? Number.POSITIVE_INFINITY
  return ms < te && me > ts
}
