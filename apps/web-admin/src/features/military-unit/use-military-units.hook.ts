import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { militaryUnitApi } from '@/shared/api/military-unit'
import type {
  MilitaryUnit,
  CreateMilitaryUnitInput,
  UpdateMilitaryUnitInput,
} from '@/shared/api/military-unit'

export function useMilitaryUnits() {
  return useQuery<MilitaryUnit[], Error>({
    queryKey: ['militaryUnits'],
    /* 함수를 그대로 넘기면 react-query 컨텍스트가 필터 인자로 들어간다 */
    queryFn: () => militaryUnitApi.getAll(),
  })
}

export function useMilitaryUnit(id: string) {
  return useQuery<MilitaryUnit, Error>({
    queryKey: ['militaryUnits', id],
    queryFn: () => militaryUnitApi.getById(id),
    enabled: !!id,
  })
}

export function useCreateMilitaryUnit() {
  const queryClient = useQueryClient()
  return useMutation<MilitaryUnit, Error, CreateMilitaryUnitInput>({
    mutationFn: militaryUnitApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['militaryUnits'] })
    },
  })
}

export function useUpdateMilitaryUnit() {
  const queryClient = useQueryClient()
  return useMutation<
    MilitaryUnit,
    Error,
    { id: string; data: UpdateMilitaryUnitInput }
  >({
    mutationFn: ({ id, data }) => militaryUnitApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['militaryUnits'] })
    },
  })
}

export function useDeleteMilitaryUnit() {
  const queryClient = useQueryClient()
  return useMutation<void, Error, string>({
    mutationFn: militaryUnitApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['militaryUnits'] })
    },
  })
}

