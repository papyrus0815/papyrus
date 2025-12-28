import { useQuery } from '@tanstack/react-query'
import * as religionsApi from '@api/functional/religions'
import { apiConnection } from '../client'

export type Religion = Awaited<ReturnType<typeof religionsApi.getAll>>[number]

export function useReligions() {
  return useQuery({
    queryKey: ['religions'],
    queryFn: async () => {
      const response = (await religionsApi.getAll(apiConnection)) as any
      return (response.data || response) as Religion[]
    },
  })
}
