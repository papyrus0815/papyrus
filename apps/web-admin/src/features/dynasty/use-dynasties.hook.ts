import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { dynastyApi } from '@/shared/api/dynasty'

export const useDynasties = () => {
  return useQuery({
    queryKey: ['dynasties'],
    queryFn: dynastyApi.getAll,
  })
}

export const useDynasty = (id: string) => {
  return useQuery({
    queryKey: ['dynasty', id],
    queryFn: () => dynastyApi.getById(id),
    enabled: !!id,
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
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      dynastyApi.update(id, data),
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

