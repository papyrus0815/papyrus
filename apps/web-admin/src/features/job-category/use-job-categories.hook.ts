import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { jobCategoryApi } from '@/shared/api/job-category'

export const useJobCategories = () => {
  return useQuery({
    queryKey: ['job-categories'],
    queryFn: jobCategoryApi.getAll,
  })
}

export const useJobCategory = (id: string) => {
  return useQuery({
    queryKey: ['job-category', id],
    queryFn: () => jobCategoryApi.getById(id),
    enabled: !!id,
  })
}

export const useCreateJobCategory = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: jobCategoryApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-categories'] })
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
    },
  })
}

export const useUpdateJobCategory = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      jobCategoryApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['job-categories'] })
      queryClient.invalidateQueries({ queryKey: ['job-category', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
    },
  })
}

export const useDeleteJobCategory = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: jobCategoryApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-categories'] })
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
    },
  })
}


