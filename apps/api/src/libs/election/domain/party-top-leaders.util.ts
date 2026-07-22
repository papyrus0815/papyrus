import { PrismaService } from '@prisma/prisma.service'
import { resolveCountryScopeOr } from '../../country/domain/country-scope.util'

/**
 * 정당 소속 국가(현대·역사)와 일치하는 재임 `where` — `person` 레포와 동일 규칙.
 * 현대 국가 스코프(브리지 연결 역사국가 합산)는 공용 헬퍼 resolveCountryScopeOr를
 * 재사용하고, 역사국가 단독 소속만 이 유틸이 별도로 처리한다.
 */
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
    return resolveCountryScopeOr(prisma, countryId)
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
