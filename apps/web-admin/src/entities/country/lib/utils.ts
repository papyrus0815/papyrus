import type { Country } from '../api'

/**
 * 국가 목록의 통계 데이터 계산
 */
export function getSummaryMetrics(list: Country[]) {
  const totalCount = list.length
  const totalPopulation = list.reduce((acc, country) => {
    const pop = country.population ? parseInt(String(country.population), 10) : 0
    return acc + pop
  }, 0)
  const totalArea = list.reduce(
    (accumulatedArea, country) => accumulatedArea + (country.areaSqKm || 0),
    0,
  )
  const avgAreaRaw = list.length ? totalArea / list.length : 0
  const avgPopulation = list.length ? totalPopulation / list.length : 0
  const avgDensity = totalArea > 0 ? totalPopulation / totalArea : 0

  const largestCountry = list.reduce(
    (max, country) =>
      (country.areaSqKm || 0) > (max.areaSqKm || 0) ? country : max,
    list[0] || null,
  )

  const mostPopulousCountry = list.reduce((max, country) => {
    const currentPop = country.population ? parseInt(String(country.population), 10) : 0
    const maxPop = max.population ? parseInt(String(max.population), 10) : 0
    return currentPop > maxPop ? country : max
  }, list[0] || null)

  return {
    totalCount,
    totalPopulation,
    totalArea,
    avgArea: Math.round(avgAreaRaw),
    avgPopulation: Math.round(avgPopulation),
    avgDensity: Math.round(avgDensity),
    largestCountry,
    mostPopulousCountry,
  }
}
