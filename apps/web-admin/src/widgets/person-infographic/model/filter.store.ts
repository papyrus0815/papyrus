import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import type { Scope } from './types'

export type PersonInfographicView =
  | 'cards'
  | 'matrix'
  | 'galaxy'
  | 'story'
  | 'dynasty'

export type AliveFilter = 'all' | 'alive' | 'dead'

interface PersonInfographicFilterState {
  scope: Scope
  minInfluence: number
  aliveFilter: AliveFilter
  view: PersonInfographicView
  query: string
  /** 좋아요 고정 인물 (localStorage로 유지) */
  pinned: string[]

  setScope: (scope: Scope) => void
  setMinInfluence: (n: number) => void
  setAliveFilter: (v: AliveFilter) => void
  setView: (v: PersonInfographicView) => void
  setQuery: (q: string) => void
  togglePin: (id: string) => void
  resetFilters: () => void
}

const DEFAULT_SCOPE: Scope = { type: 'all', val: null }

export const usePersonInfographicFilterStore =
  create<PersonInfographicFilterState>()(
    persist(
      (set) => ({
        scope: DEFAULT_SCOPE,
        minInfluence: 0,
        aliveFilter: 'all',
        view: 'cards',
        query: '',
        pinned: [],

        setScope: (scope) => set({ scope }),
        setMinInfluence: (minInfluence) => set({ minInfluence }),
        setAliveFilter: (aliveFilter) => set({ aliveFilter }),
        setView: (view) => set({ view }),
        setQuery: (query) => set({ query }),
        togglePin: (id) =>
          set((state) => ({
            pinned: state.pinned.includes(id)
              ? state.pinned.filter((x) => x !== id)
              : [...state.pinned, id],
          })),
        resetFilters: () =>
          set({
            scope: DEFAULT_SCOPE,
            minInfluence: 0,
            aliveFilter: 'all',
            query: '',
          }),
      }),
      {
        name: 'person-infographic-filter',
        partialize: (state) => ({
          pinned: state.pinned,
          view: state.view,
        }),
      },
    ),
  )
