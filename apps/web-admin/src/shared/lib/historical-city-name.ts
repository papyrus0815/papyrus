export interface CityHistoricalNameEntry {
  name: string
  fromYear?: number | null
  toYear?: number | null
}

export interface CityWithHistoricalNames {
  id?: string
  name: string
  historicalNames?: unknown
}

/**
 * 사건 발생 연도(year)에 해당하는 옛 지명(예: 1941년 레닌그라드·스탈린그라드)이 있으면
 * `레닌그라드 (현 상트페테르부르크)` 형태로 반환하고, 없으면 현재 지명을 반환한다.
 */
export function formatHistoricalCityName(
  city: CityWithHistoricalNames | null | undefined,
  eventYear: number | null | undefined,
): string | null {
  if (!city?.name) return null
  const currentName = city.name.trim()
  if (!currentName) return null

  if (eventYear == null || !Array.isArray(city.historicalNames)) {
    return currentName
  }

  for (const rawEntry of city.historicalNames) {
    if (!rawEntry || typeof rawEntry !== 'object') continue
    const entry = rawEntry as CityHistoricalNameEntry
    const histName = typeof entry.name === 'string' ? entry.name.trim() : ''
    if (!histName) continue
    const fromOk = entry.fromYear == null || eventYear >= entry.fromYear
    const toOk = entry.toYear == null || eventYear <= entry.toYear
    if (fromOk && toOk && histName !== currentName) {
      return `${histName} (현 ${currentName})`
    }
  }

  return currentName
}
