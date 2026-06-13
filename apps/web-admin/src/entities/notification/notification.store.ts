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
  /** 변경의 초점이 된 하위 리소스 (보조 칩: 전기·경력 등) */
  subResourceType?: string
  /** 변경을 수행한 사용자 표시명 (없으면 미표시) */
  actorName?: string
  /** 알림 대상 레코드 ID (상세 페이지 이동용) */
  recordId?: string
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
        messages: list.map((item) => ({
          id: item.id,
          title: item.title,
          preview: item.preview,
          time: item.time,
          unread: item.unread,
          ownerType: item.ownerType,
          subResourceType: item.subResourceType,
          actorName: item.actorName,
          recordId: item.recordId,
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
      messages: state.messages.map((message) => ({ ...message, unread: false })),
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
      messages: state.messages.map((message) =>
        message.id === id ? { ...message, unread: false } : message,
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
