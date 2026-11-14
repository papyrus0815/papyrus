import { useQuery } from '@tanstack/react-query'

import {
  type ConstituentHistoricalPolityDto,
  personCareerApi,
} from '@/shared/api/person-career'

export function constituentPolitiesQueryKey(
  historicalCountryId: string | undefined,
) {
  return ['constituent-historical-polities', historicalCountryId ?? ''] as const
}

export function useConstituentHistoricalPolities(
  historicalCountryId: string | undefined,
) {
  return useQuery<ConstituentHistoricalPolityDto[]>({
    queryKey: constituentPolitiesQueryKey(historicalCountryId),
    queryFn: () =>
      personCareerApi.getConstituentHistoricalPolities(historicalCountryId!),
    enabled: Boolean(historicalCountryId),
    staleTime: 5 * 60_000,
  })
}
