/** 정체 react-query 훅 — 조회·생성·수정·삭제. */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  createPoliticalSystem,
  deletePoliticalSystem,
  listPoliticalSystems,
  updatePoliticalSystem,
  type CreatePoliticalSystemInput,
  type PoliticalSystem,
  type PoliticalSystemScope,
  type UpdatePoliticalSystemInput,
} from '@/shared/api/political-system'

export type {
  PoliticalSystem,
  PoliticalSystemScope,
  CreatePoliticalSystemInput,
  UpdatePoliticalSystemInput,
}

export const politicalSystemKeys = {
  /** 무효화는 이 프리픽스 하나로 — 스코프별 키가 모두 아래 달린다 */
  all: ['political-systems'] as const,
  list: (scope: PoliticalSystemScope) =>
    ['political-systems', scope.countryId ?? null, scope.historicalCountryId ?? null] as const,
}

export function usePoliticalSystems(scope: PoliticalSystemScope) {
  const enabled = !!(scope.countryId || scope.historicalCountryId)
  return useQuery<PoliticalSystem[]>({
    queryKey: politicalSystemKeys.list(scope),
    queryFn: () => listPoliticalSystems(scope),
    enabled,
    staleTime: 60_000,
  })
}

export function useCreatePoliticalSystem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreatePoliticalSystemInput) => createPoliticalSystem(dto),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: politicalSystemKeys.all }),
  })
}

export function useUpdatePoliticalSystem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdatePoliticalSystemInput }) =>
      updatePoliticalSystem(id, dto),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: politicalSystemKeys.all }),
  })
}

export function useDeletePoliticalSystem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deletePoliticalSystem(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: politicalSystemKeys.all }),
  })
}
