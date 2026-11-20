import { type MilitaryUnit, militaryUnitApi } from '@/shared/api/military-unit'

export const militaryUnitQueryKeys = {
  all: ['military-units'] as const,
  globalCatalog: () => ['military-units', 'global-catalog'] as const,
  countryScope: (
    mode: 'hist' | 'mod',
    countryId: string,
    relatedHistKey = '',
    summary = false,
  ) =>
    [
      'military-units',
      'country-scope',
      mode,
      countryId,
      relatedHistKey,
      summary ? 'summary' : 'full',
    ] as const,
  detail: (unitId: string | null | undefined) =>
    ['military-unit', 'detail', unitId ?? ''] as const,
}

/**
 * 국가(현대국/역사정치체) 범위 군사 부대 목록 단일 조회 함수.
 *
 * - 현대 국가: 백엔드 `GET /military-units?countryId=`가 이미 연결된 역사국가(`linkedHistoricalIds`)를
 *   서버에서 자동 병합하므로 단 1회 요청으로 조회합니다(기존 N+1 중복 요청 제거).
 * - 역사 국가: 구성 정치체(constituentPolities)가 있는 경우에만 병렬 합산 후 중복 제거합니다.
 */
export async function fetchCountryScopedMilitaryUnits(params: {
  countryId: string
  isHistorical: boolean
  relatedHistoricalIds?: ReadonlyArray<string>
  summary?: boolean
}): Promise<MilitaryUnit[]> {
  const {
    countryId,
    isHistorical,
    relatedHistoricalIds = [],
    summary = false,
  } = params
  if (!countryId) return []

  if (!isHistorical) {
    return militaryUnitApi.getAll({ countryId, summary })
  }

  const histIds = Array.from(new Set([countryId, ...relatedHistoricalIds]))
  if (histIds.length === 1) {
    return militaryUnitApi.getAll({
      historicalCountryId: histIds[0],
      summary,
    })
  }

  const batches = await Promise.all(
    histIds.map((hid) =>
      militaryUnitApi.getAll({ historicalCountryId: hid, summary }),
    ),
  )
  const dedup = new Map<string, MilitaryUnit>()
  for (const batch of batches) {
    for (const unitItem of batch) {
      dedup.set(unitItem.id, unitItem)
    }
  }
  return [...dedup.values()]
}
