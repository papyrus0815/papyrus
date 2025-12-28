import apiClient from './client'

export const socialApi = {
  // Follow
  follow: async (userId: string) => {
    const response = await apiClient.post(`/social/follow/${userId}`)
    return (response.data as any).data || response.data
  },

  unfollow: async (userId: string) => {
    const response = await apiClient.delete(`/social/follow/${userId}`)
    return (response.data as any).data || response.data
  },

  isFollowing: async (userId: string) => {
    const response = await apiClient.get<{ isFollowing: boolean }>(`/social/following/${userId}`)
    return (response.data as any).data || response.data
  },

  // Like
  like: async (curationId: string) => {
    const response = await apiClient.post(`/social/like/${curationId}`)
    return (response.data as any).data || response.data
  },

  unlike: async (curationId: string) => {
    const response = await apiClient.delete(`/social/like/${curationId}`)
    return (response.data as any).data || response.data
  },

  isLiked: async (curationId: string) => {
    const response = await apiClient.get<{ isLiked: boolean }>(`/social/liked/${curationId}`)
    return (response.data as any).data || response.data
  },

  // Comment
  createComment: async (curationId: string, content: string, parentId?: string) => {
    const response = await apiClient.post(`/social/comment/${curationId}`, { content, parentId })
    return (response.data as any).data || response.data
  },

  getComments: async (curationId: string, page = 1, pageSize = 20) => {
    const response = await apiClient.get(`/social/comments/${curationId}`, {
      params: { page, pageSize },
    })
    return (response.data as any).data || response.data
  },

  deleteComment: async (commentId: string) => {
    const response = await apiClient.delete(`/social/comment/${commentId}`)
    return (response.data as any).data || response.data
  },
}

