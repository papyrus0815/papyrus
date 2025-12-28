import apiClient from './client'

export interface CurationResponse {
  id: string
  userId: string
  itemType: string
  itemId: string
  title: string
  content: string
  images?: string[]
  sources?: string[]
  tags?: string[]
  visibility: string
  status: string
  viewCount: number
  likeCount: number
  commentCount: number
  isVerified: boolean
  createdAt: string
  publishedAt?: string
}

export interface CurationListResponse {
  curations: CurationResponse[]
  total: number
}

export const curationApi = {
  // 전체 큐레이션 목록 (홈 피드용)
  getCurations: async (page = 1, pageSize = 20) => {
    const response = await apiClient.get<CurationListResponse>('/curations', {
      params: { page, pageSize },
    })
    return (response.data as any).data || response.data
  },

  // 항목 피드 조회
  getItemFeed: async (itemType: string, itemId: string, page = 1, pageSize = 20) => {
    const response = await apiClient.get<CurationListResponse>(`/curations/item/${itemType}/${itemId}`, {
      params: { page, pageSize },
    })
    return (response.data as any).data || response.data
  },

  // 사용자 큐레이션 목록
  getUserCurations: async (userId: string, page = 1, pageSize = 20) => {
    const response = await apiClient.get<CurationListResponse>(`/curations/user/${userId}`, {
      params: { page, pageSize },
    })
    return (response.data as any).data || response.data
  },

  // 큐레이션 상세 조회
  getById: async (id: string) => {
    const response = await apiClient.get<CurationResponse>(`/curations/${id}`)
    return (response.data as any).data || response.data
  },

  // 큐레이션 생성
  create: async (data: {
    itemType: string
    itemId: string
    title: string
    content: string
    images?: string[]
    sources?: string[]
    tags?: string[]
    publish?: boolean
  }) => {
    const response = await apiClient.post<CurationResponse>('/curations', data)
    return (response.data as any).data || response.data
  },

  // 큐레이션 업데이트
  update: async (id: string, data: { title?: string; content?: string; images?: string[]; sources?: string[]; tags?: string[] }) => {
    const response = await apiClient.put<CurationResponse>(`/curations/${id}`, data)
    return (response.data as any).data || response.data
  },

  // 큐레이션 삭제
  delete: async (id: string) => {
    await apiClient.delete(`/curations/${id}`)
  },
}

