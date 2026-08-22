import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/** 최근 방문 인물 최대 보관 수 */
export const MAX_RECENT_PERSONS = 8

interface RecentPersonsState {
  /** 최근 방문 인물 ID (가장 최근이 맨 앞) */
  recentIds: string[]
  push: (id: string) => void
  /** 인물 삭제 시 최근 목록에서 제거 (유령 id 잔존 방지) */
  remove: (id: string) => void
  clear: () => void
}

/** 국가 목록의 recent-countries와 같은 역할 — 사이드바 '최근' 빠른 접근 그룹. */
export const useRecentPersonsStore = create<RecentPersonsState>()(
  persist(
    (set) => ({
      recentIds: [],
      push: (id) =>
        set((state) => {
          const next = [
            id,
            ...state.recentIds.filter((recentId) => recentId !== id),
          ].slice(0, MAX_RECENT_PERSONS)
          return { recentIds: next }
        }),
      remove: (id) =>
        set((state) => ({
          recentIds: state.recentIds.filter((recentId) => recentId !== id),
        })),
      clear: () => set({ recentIds: [] }),
    }),
    {
      name: 'recent-persons',
      version: 1,
    },
  ),
)
