import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  dynastyApi,
  type DynastyDetail,
  type DynastyMutationBody,
  type DynastyRuleReasonBody,
} from '@/shared/api/dynasty'

/** 상세 쿼리키 — getById(useDynasty)의 ['dynasty', id]와 별도 슬롯. */
const dynastyDetailKey = (id: string) => ['dynasty-detail', id] as const

export const useDynasties = () => {
  return useQuery({
    queryKey: ['dynasties'],
    queryFn: dynastyApi.getAll,
    staleTime: 60_000,
  })
}

export const useDynasty = (id: string) => {
  return useQuery({
    queryKey: ['dynasty', id],
    queryFn: () => dynastyApi.getById(id),
    enabled: !!id,
  })
}

/** 가문 상세 — 통치기록(역사/현대) + 구성원 포함. 통치기록 모달이 소비. */
export const useDynastyDetail = (id: string, enabled = true) => {
  return useQuery({
    queryKey: dynastyDetailKey(id),
    queryFn: () => dynastyApi.getDetail(id),
    enabled: enabled && !!id,
    staleTime: 60_000,
  })
}

/** 통치기록(역사/현대) 종료 사유·비고 편집 — 갱신된 상세를 캐시에 직접 반영. */
export const useUpdateDynastyRuleReason = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      dynastyId,
      ruleId,
      kind,
      body,
    }: {
      dynastyId: string
      ruleId: string
      kind: 'historical' | 'modern'
      body: DynastyRuleReasonBody
    }) =>
      kind === 'historical'
        ? dynastyApi.updateHistoricalRuleReason(dynastyId, ruleId, body)
        : dynastyApi.updateModernRuleReason(dynastyId, ruleId, body),
    onSuccess: (detail: DynastyDetail, variables) => {
      // 서버가 갱신된 상세 전체를 반환 — 재요청 없이 캐시에 직접 세팅.
      queryClient.setQueryData(dynastyDetailKey(variables.dynastyId), detail)
    },
  })
}

export const useCreateDynasty = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: dynastyApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dynasties'] })
    },
  })
}

export const useUpdateDynasty = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string
      data: Partial<DynastyMutationBody>
    }) => dynastyApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['dynasties'] })
      queryClient.invalidateQueries({ queryKey: ['dynasty', variables.id] })
    },
  })
}

export const useDeleteDynasty = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: dynastyApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dynasties'] })
    },
  })
}
