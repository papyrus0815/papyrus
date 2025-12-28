import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as personsApi from '@/shared/api/persons'
import type {
  PersonResponseDto,
  CreatePersonDto,
  UpdatePersonDto,
  Era,
} from '@/shared/api/persons'

// SDK 타입을 그대로 사용
export type Person = PersonResponseDto
export type CreatePersonData = CreatePersonDto
export type UpdatePersonData = UpdatePersonDto
export type { Era }

/**
 * Person API 쿼리 키
 */
export const personKeys = {
  all: ['persons'] as const,
  detail: (id: string) => ['persons', id] as const,
}

/**
 * 모든 인물 목록 조회 훅
 */
export function usePersons() {
  return useQuery({
    queryKey: personKeys.all,
    queryFn: async () => {
      const response = await personsApi.getAllPersons()
      return response as Person[]
    },
  })
}

/**
 * ID로 인물 조회 훅
 */
export function usePerson(id: string) {
  return useQuery({
    queryKey: personKeys.detail(id),
    queryFn: async () => {
      const response = await personsApi.getPersonById(id)
      return response as Person
    },
    enabled: !!id,
  })
}

/**
 * 인물 생성 뮤테이션 훅
 */
export function useCreatePerson() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreatePersonData) => {
      const response = await personsApi.createPerson(data)
      return response as Person
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: personKeys.all })
    },
  })
}

/**
 * 인물 수정 뮤테이션 훅
 */
export function useUpdatePerson() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string
      data: UpdatePersonData
    }) => {
      const response = await personsApi.updatePerson(id, data)
      return response as Person
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: personKeys.all })
      queryClient.invalidateQueries({
        queryKey: personKeys.detail(variables.id),
      })
    },
  })
}

/**
 * 인物 삭제 뮤테이션 훅
 */
export function useDeletePerson() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await personsApi.deletePerson(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: personKeys.all })
    },
  })
}
