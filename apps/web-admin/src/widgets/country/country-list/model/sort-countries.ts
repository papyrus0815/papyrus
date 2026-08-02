/**
 * 국가 목록 정렬 — 순수 비교자. (api client 등 런타임 의존 없이 단독 테스트 가능하도록 분리)
 */
import type { UnifiedCountry } from '@/entities/country/model/unified-types'

export type SortBy = 'name' | 'population' | 'area'

/**
 * 정렬 비교자 — 이름/인구/면적. 인구·면적이 없는 항목(역사 국가 등)은 끝으로 밀고 이름순 tiebreak.
 * 검색 합류처럼 현대·역사가 섞여도 UI의 정렬 선택과 실제 순서가 어긋나지 않게 한다(F3).
 */
export function compareBySort(
  sortBy: SortBy,
): (left: UnifiedCountry, right: UnifiedCountry) => number {
  return (left, right) => {
    if (sortBy === 'population' || sortBy === 'area') {
      const leftMetric =
        sortBy === 'population' ? Number(left.population) : (left.areaSqKm ?? NaN)
      const rightMetric =
        sortBy === 'population'
          ? Number(right.population)
          : (right.areaSqKm ?? NaN)
      const leftValid = Number.isFinite(leftMetric)
      const rightValid = Number.isFinite(rightMetric)
      if (leftValid && rightValid && leftMetric !== rightMetric)
        return rightMetric - leftMetric // 큰 값이 먼저 (내림차순)
      if (leftValid !== rightValid) return leftValid ? -1 : 1 // 값 없는 쪽을 끝으로
    }
    return left.name.localeCompare(right.name, 'ko')
  }
}
