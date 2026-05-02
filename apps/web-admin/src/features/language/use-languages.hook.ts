/**
 * 언어 마스터 조회 훅 — read-only.
 * 폼 SelectModal에서 사용.
 */
import { useQuery } from '@tanstack/react-query'
import * as languagesApi from '@/shared/api/languages'

export const languageKeys = {
  all: ['languages'] as const,
  list: () => [...languageKeys.all, 'list'] as const,
}

export function useLanguages() {
  return useQuery({
    queryKey: languageKeys.list(),
    queryFn: () => languagesApi.getAllLanguages(),
    staleTime: 1000 * 60 * 30,
  })
}
