import { create } from 'zustand'

import { notificationsApi } from '@/shared/api/notifications'

export interface NotificationMessage {
  id: string
  title: string
  preview?: string
  time: string
  unread?: boolean
  /** 알림 대상 리소스 타입 (표시용: 인물, 국가 등) */
  ownerType?: string
}

interface NotificationState {
  messages: NotificationMessage[]
  isLoading: boolean
}

interface NotificationActions {
  fetchNotifications: () => Promise<void>
  markAllRead: () => Promise<void>
  markOneRead: (id: string) => Promise<void>
  setMessages: (messages: NotificationMessage[]) => void
}

export const useNotificationStore = create<NotificationState & NotificationActions>()((set) => ({
  messages: [],
  isLoading: false,

  fetchNotifications: async () => {
    set({ isLoading: true })
    try {
      const list = await notificationsApi.getList()
      set({
        messages: list.map((n) => ({
          id: n.id,
          title: n.title,
          preview: n.preview,
          time: n.time,
          unread: n.unread,
          ownerType: n.ownerType,
        })),
      })
    } catch {
      // keep current messages on error
    } finally {
      set({ isLoading: false })
    }
  },

  markAllRead: async () => {
    try {
      await notificationsApi.markAllRead()
      set((state) => ({
        messages: state.messages.map((m) => ({ ...m, unread: false })),
      }))
    } catch {
      // optimistic: update local anyway
      set((state) => ({
        messages: state.messages.map((m) => ({ ...m, unread: false })),
      }))
    }
  },

  markOneRead: async (id: string) => {
    try {
      await notificationsApi.markRead(id)
      set((state) => ({
        messages: state.messages.map((m) =>
          m.id === id ? { ...m, unread: false } : m,
        ),
      }))
    } catch {
      set((state) => ({
        messages: state.messages.map((m) =>
          m.id === id ? { ...m, unread: false } : m,
        ),
      }))
    }
  },

  setMessages: (messages) => set({ messages }),
}))
