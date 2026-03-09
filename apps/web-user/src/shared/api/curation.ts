import apiClient from './client'

export interface CurationResponse {
  id: string
  userId: string
  keywords?: string
  title: string
  content: string
  visibility: string
  status: string
  viewCount: number
  likeCount: number
  commentCount: number
  createdAt: string
  publishedAt?: string
}

export interface CurationListResponse {
  curations: CurationResponse[]
  total: number
}

export const curationApi = {
  // 전체 글 목록 (홈 피드용)
  getCurations: async (page = 1, pageSize = 20) => {
    const response = await apiClient.get<CurationListResponse>('/posts', {
      params: { page, pageSize },
    })
    return (response.data as any).data || response.data
  },

  // 사용자 글 목록
  getUserCurations: async (userId: string, page = 1, pageSize = 20) => {
    const response = await apiClient.get<CurationListResponse>(`/posts/user/${userId}`, {
      params: { page, pageSize },
    })
    return (response.data as any).data || response.data
  },

  // 글 상세 조회
  getById: async (id: string) => {
    const response = await apiClient.get<CurationResponse>(`/posts/${id}`)
    return (response.data as any).data || response.data
  },

  // 글 생성
  create: async (data: {
    title: string
    content: string
    keywords?: string
    visibility?: string
    publish?: boolean
  }) => {
    const response = await apiClient.post<CurationResponse>('/posts', data)
    return (response.data as any).data || response.data
  },

  // 글 업데이트
  update: async (id: string, data: { title?: string; content?: string; keywords?: string; visibility?: string }) => {
    const response = await apiClient.put<CurationResponse>(`/posts/${id}`, data)
    return (response.data as any).data || response.data
  },

  // 글 삭제
  delete: async (id: string) => {
    await apiClient.delete(`/posts/${id}`)
  },
}

