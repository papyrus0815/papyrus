import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/** 고정(즐겨찾기) 국가 ID — 사이드바 상단에 항상 보임. localStorage 유지. */
interface PinnedCountriesState {
  pinnedIds: string[]
  toggle: (id: string) => void
  isPinned: (id: string) => boolean
}

export const usePinnedCountriesStore = create<PinnedCountriesState>()(
  persist(
    (set, get) => ({
      pinnedIds: [],
      toggle: (id) =>
        set((state) => {
          if (state.pinnedIds.includes(id)) {
            return { pinnedIds: state.pinnedIds.filter((x) => x !== id) }
          }
          return { pinnedIds: [...state.pinnedIds, id] }
        }),
      isPinned: (id) => get().pinnedIds.includes(id),
    }),
    {
      name: 'pinned-countries',
      version: 1,
    },
  ),
)
