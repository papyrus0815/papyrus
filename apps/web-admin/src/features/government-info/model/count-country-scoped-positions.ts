import type { UnifiedCountry } from '@/entities/country/model/unified-types'

export interface ConstituentPolityIdLike {
  id?: string | null
}

export interface CountryScopedPositionLike {
  isGeneric?: boolean | null
  administrationDepartmentId?: string | null
  organizationId?: string | null
  scopes?: ReadonlyArray<{
    countryId?: string | null
    historicalCountryId?: string | null
  }> | null
  administrationDepartment?: {
    countryId?: string | null
    historicalCountryId?: string | null
  } | null
}

/**
 * `PositionDefinitionsSection`의 `countryOnly` 스코프 판정과 100% 동일한 기준으로
 * 현재 국가(현대 + 연결된 과거 국가, 또는 복합 역사국가 + 구성국) 전용 고유 관직 수를 계산한다.
 */
export function countCountryScopedPositions(
  definitions: ReadonlyArray<CountryScopedPositionLike>,
  country: UnifiedCountry | null | undefined,
  constituentPolities: readonly ConstituentPolityIdLike[] = [],
): number {
  if (!country) return 0
  const modernIds = new Set<string>()
  const historicalIds = new Set<string>()

  if (country.type === 'historical') {
    historicalIds.add(country.id)
    for (const polityItem of constituentPolities) {
      if (polityItem.id) historicalIds.add(polityItem.id)
    }
  } else {
    modernIds.add(country.id)
    for (const histCountry of country.historicalCountries ?? []) {
      if (histCountry.id) historicalIds.add(histCountry.id)
    }
  }

  let total = 0
  for (const defItem of definitions) {
    if (defItem.isGeneric === true) continue

    const scopes = defItem.scopes ?? []
    const isGlobal =
      scopes.length === 0 &&
      !defItem.administrationDepartmentId &&
      !defItem.organizationId
    if (isGlobal) continue

    const matchesScope = scopes.some((scopeItem) =>
      scopeItem.historicalCountryId
        ? historicalIds.has(scopeItem.historicalCountryId)
        : Boolean(scopeItem.countryId && modernIds.has(scopeItem.countryId)),
    )
    if (matchesScope) {
      total += 1
      continue
    }

    const dept = defItem.administrationDepartment
    if (dept) {
      const matchesDept = dept.historicalCountryId
        ? historicalIds.has(dept.historicalCountryId)
        : Boolean(dept.countryId && modernIds.has(dept.countryId))
      if (matchesDept) {
        total += 1
      }
    }
  }

  return total
}
