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
    // 낙관적 업데이트: 서버 응답과 무관하게 즉시 읽음 처리 (실패해도 로컬 유지)
    set((state) => ({
      messages: state.messages.map((m) => ({ ...m, unread: false })),
    }))
    try {
      await notificationsApi.markAllRead()
    } catch {
      // 서버 반영 실패는 무시 — 로컬 상태는 이미 갱신됨
    }
  },

  markOneRead: async (id: string) => {
    // 낙관적 업데이트: 즉시 해당 항목을 읽음 처리 (실패해도 로컬 유지)
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === id ? { ...m, unread: false } : m,
      ),
    }))
    try {
      await notificationsApi.markRead(id)
    } catch {
      // 서버 반영 실패는 무시
    }
  },

  setMessages: (messages) => set({ messages }),
}))
