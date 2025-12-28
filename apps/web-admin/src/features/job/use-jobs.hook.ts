import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { jobApi } from '@/shared/api/job'

export const useJobs = () => {
  return useQuery({
    queryKey: ['jobs'],
    queryFn: jobApi.getAll,
  })
}

export const useJob = (id: string) => {
  return useQuery({
    queryKey: ['job', id],
    queryFn: () => jobApi.getById(id),
    enabled: !!id,
  })
}

export const useCreateJob = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: jobApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
    },
  })
}

export const useUpdateJob = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      jobApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
      queryClient.invalidateQueries({ queryKey: ['job', variables.id] })
    },
  })
}

export const useDeleteJob = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: jobApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
    },
  })
}


