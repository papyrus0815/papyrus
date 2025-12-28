import { useQuery } from '@tanstack/react-query'
import { countryApi } from '@/shared/api/country'
import type { Country } from '@/shared/api/country'

export function useCountries() {
  return useQuery<Country[], Error>({
    queryKey: ['countries'],
    queryFn: countryApi.getAll,
  })
}
