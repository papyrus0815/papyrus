import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ethnicityApi } from '@/shared/api/ethnicity'

export const useEthnicities = () => {
  return useQuery({
    queryKey: ['ethnicities'],
    queryFn: () => ethnicityApi.getAll(),
  })
}

export const useEthnicity = (id: string) => {
  return useQuery({
    queryKey: ['ethnicity', id],
    queryFn: () => ethnicityApi.getById(id),
    enabled: !!id,
  })
}

export const useCreateEthnicity = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ethnicityApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ethnicities'] })
    },
  })
}

export const useUpdateEthnicity = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof ethnicityApi.update>[1] }) =>
      ethnicityApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ethnicities'] })
      queryClient.invalidateQueries({ queryKey: ['ethnicity', variables.id] })
    },
  })
}

export const useDeleteEthnicity = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ethnicityApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ethnicities'] })
    },
  })
}
