import axios from 'axios'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  headers: { 'Content-Type': 'application/json' },
})

export interface NotificationItem {
  id: string
  title: string
  preview?: string
  time: string
  unread: boolean
  ownerType?: string
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
