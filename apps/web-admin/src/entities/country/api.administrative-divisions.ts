import { useQuery } from '@tanstack/react-query'

import { type AdministrativeDivision, cityApi } from '@/shared/api/city'

export type { AdministrativeDivision } from '@/shared/api/city'

export const administrativeDivisionKeys = {
  all: ['administrative-divisions'] as const,
  byCountry: (countryId: string) =>
    ['administrative-divisions', { countryId }] as const,
}

/**
 * 국가별 행정구역 트리 조회 (최상위만 반환, 자식은 nested로 포함)
 */
export function useAdministrativeDivisions(countryId: string | undefined) {
  return useQuery({
    queryKey: administrativeDivisionKeys.byCountry(countryId ?? ''),
    queryFn: async (): Promise<AdministrativeDivision[]> => {
      if (!countryId) return []
      return await cityApi.getAdministrativeDivisions(countryId)
    },
    enabled: !!countryId,
  })
}

/**
 * 트리에서 ID로 노드를 찾는 헬퍼 (재귀)
 */
export function findDivisionById(
  divisions: AdministrativeDivision[],
  id: string,
): AdministrativeDivision | null {
  for (const div of divisions) {
    if (div.id === id) return div
    if (div.children?.length) {
      const found = findDivisionById(div.children, id)
      if (found) return found
    }
  }
  return null
}
