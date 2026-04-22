import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/** 최근 방문 국가 최대 보관 수 */
export const MAX_RECENT_COUNTRIES = 8

interface RecentCountriesState {
  /** 최근 방문 국가 ID (가장 최근이 맨 앞) */
  recentIds: string[]
  push: (id: string) => void
  clear: () => void
}

export const useRecentCountriesStore = create<RecentCountriesState>()(
  persist(
    (set) => ({
      recentIds: [],
      push: (id) =>
        set((state) => {
          const next = [id, ...state.recentIds.filter((x) => x !== id)].slice(
            0,
            MAX_RECENT_COUNTRIES,
          )
          return { recentIds: next }
        }),
      clear: () => set({ recentIds: [] }),
    }),
    {
      name: 'recent-countries',
      // 스키마 변경 시 올려서 구 버전 localStorage 자동 리셋
      version: 1,
      migrate: () => ({ recentIds: [] as string[] }),
    },
  ),
)
