import type { QueryClient } from '@tanstack/react-query'

/**
 * React Query 키 — 중앙부처(행정조직) 국가별 목록
 * @see administrationDepartmentApi.getByCountryId
 */
export function administrationDepartmentsByCountryQueryKey(
  countryId: string | undefined,
) {
  return ['administration-departments-by-country', countryId] as const
}

/** 전체 행정부처 목록 — 관리자 목록 페이지 등 */
export function administrationDepartmentsAllQueryKey() {
  return ['administration-departments', 'all'] as const
}

/** 국가 상세·목록·폼에서 부처 데이터 갱신 시 함께 무효화 */
export function invalidateAdministrationDepartmentQueries(
  queryClient: QueryClient,
) {
  return Promise.all([
    queryClient.invalidateQueries({
      queryKey: ['administration-departments-by-country'],
    }),
    queryClient.invalidateQueries({ queryKey: ['administration-departments'] }),
  ])
}
