/**
 * 화폐 마스터 조회 훅 — read-only.
 * 폼 SelectModal에서 사용.
 */
import { useQuery } from '@tanstack/react-query'
import * as currenciesApi from '@/shared/api/currencies'

export const currencyKeys = {
  all: ['currencies'] as const,
  list: () => [...currencyKeys.all, 'list'] as const,
}

export function useCurrencies() {
  return useQuery({
    queryKey: currencyKeys.list(),
    queryFn: () => currenciesApi.getAllCurrencies(),
    staleTime: 1000 * 60 * 30,
  })
}
