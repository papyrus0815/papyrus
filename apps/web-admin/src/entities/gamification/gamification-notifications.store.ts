import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * 게이미피케이션 개인 알림(등급 상승·뱃지 획득) 저장소.
 * 백엔드 Notification은 브로드캐스트 전용(개인 타깃 불가)이라, 개인 성취 알림은
 * 클라이언트에 영구 저장(localStorage)해 헤더 알림 벨에 합쳐 보여준다(휘발 방지).
 *
 * 공유 브라우저 대비: 모든 항목에 accountId를 달아 계정별로 격리한다(다른 계정 로그인 시
 * 이전 사용자 알림이 섞이지 않음). 조회/읽음 처리는 항상 현재 accountId 기준으로 수행.
 */
export interface GamiNotification {
  /** 안정적 ID (예: 'grade:GOLD', 'badge:CONTRIBUTOR_10') — 계정 내 중복 방지 키 */
  id: string
  /** 소유 계정 ID */
  accountId: string
  title: string
  /** 생성 시각 (epoch ms) */
  createdAt: number
  read: boolean
}

interface GamiNotificationState {
  items: GamiNotification[]
  add: (n: { id: string; accountId: string; title: string; createdAt: number }) => void
  markAllRead: (accountId: string) => void
  markRead: (accountId: string, id: string) => void
}

export const useGamiNotificationStore = create<GamiNotificationState>()(
  persist(
    (set, get) => ({
      items: [],
      add: (n) => {
        // 같은 계정 + 같은 성취는 중복 방지
        if (get().items.some((it) => it.accountId === n.accountId && it.id === n.id)) return
        set((s) => ({ items: [{ ...n, read: false }, ...s.items].slice(0, 100) }))
      },
      markAllRead: (accountId) =>
        set((s) => ({
          items: s.items.map((it) =>
            it.accountId === accountId ? { ...it, read: true } : it,
          ),
        })),
      markRead: (accountId, id) =>
        set((s) => ({
          items: s.items.map((it) =>
            it.accountId === accountId && it.id === id ? { ...it, read: true } : it,
          ),
        })),
    }),
    { name: 'gamification-notifications' },
  ),
)

/** epoch ms → "방금/N분 전/N일 전" 상대 시간 */
export function formatGamiTime(epoch: number): string {
  const diffMs = Date.now() - epoch
  const mins = Math.floor(diffMs / 60_000)
  if (mins < 1) return '방금'
  if (mins < 60) return `${mins}분 전`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}시간 전`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}일 전`
  return new Date(epoch).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
}
