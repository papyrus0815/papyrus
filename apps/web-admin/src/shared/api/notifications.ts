import axios from 'axios'

import { useSessionStore } from '@/entities/session'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  headers: { 'Content-Type': 'application/json' },
})

// /notifications에 인증 가드가 적용되므로 매 요청에 세션 토큰(Bearer)을 첨부한다.
apiClient.interceptors.request.use((config) => {
  const token = useSessionStore.getState().token
  if (token) {
    config.headers = config.headers ?? {}
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export interface NotificationItem {
  id: string
  title: string
  preview?: string
  time: string
  unread: boolean
  ownerType?: string
  /** 변경의 초점이 된 하위 리소스(예: BIOGRAPHY). 보조 칩 표시용. */
  subResourceType?: string
  /** 변경을 수행한 사용자 표시명 */
  actorName?: string
  recordId?: string
}

export const notificationsApi = {
  getList: async (params?: { limit?: number; unreadOnly?: boolean }): Promise<NotificationItem[]> => {
    const { data } = await apiClient.get<NotificationItem[]>('/notifications', { params })
    return Array.isArray(data) ? data : []
  },

  markRead: async (id: string): Promise<void> => {
    await apiClient.patch(`/notifications/${id}/read`)
  },

  markAllRead: async (): Promise<void> => {
    await apiClient.patch('/notifications/read-all')
  },
}
