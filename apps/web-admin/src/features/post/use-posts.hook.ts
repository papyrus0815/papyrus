import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as postApi from '@/shared/api/post'
import type { CreatePostDto, UpdatePostDto } from '@/shared/api/post'

export const usePostList = (params?: {
  page?: number
  pageSize?: number
  status?: string
  orderBy?: 'createdAt' | 'publishedAt' | 'viewCount' | 'likeCount'
  order?: 'asc' | 'desc'
}) => {
  return useQuery({
    queryKey: ['posts', params],
    queryFn: () => postApi.getPostList(params),
  })
}

export const usePost = (id: string) => {
  return useQuery({
    queryKey: ['post', id],
    queryFn: () => postApi.getPostById(id),
    enabled: !!id,
  })
}

export const useCreatePost = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreatePostDto) => postApi.createPost(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] })
    },
  })
}

export const useUpdatePost = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePostDto }) =>
      postApi.updatePost(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      queryClient.invalidateQueries({ queryKey: ['post', variables.id] })
    },
  })
}

export const useDeletePost = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => postApi.deletePost(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] })
    },
  })
}
