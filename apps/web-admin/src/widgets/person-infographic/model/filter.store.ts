import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type PersonInfographicView =
  | 'cards'
  | 'matrix'
  | 'galaxy'
  | 'story'
  | 'dynasty'
  | 'stats'

export type AliveFilter = 'all' | 'alive' | 'dead'

export type ScopeKind = 'era' | 'region' | 'field' | 'country'

/** 다중 선택 가능한 카테고리별 필터 — 카테고리 안 OR, 카테고리 간 AND */
export interface MultiScopes {
  era: string[]
  region: string[]
  field: string[]
  country: string[]
}

const EMPTY_SCOPES: MultiScopes = {
  era: [],
  region: [],
  field: [],
  country: [],
}

interface PersonInfographicFilterState {
  scopes: MultiScopes
  minInfluence: number
  aliveFilter: AliveFilter
  view: PersonInfographicView
  query: string
  /** 좋아요 고정 인물 (localStorage로 유지) */
  pinned: string[]

  /** 카테고리·값 toggle. 이미 있으면 제거, 없으면 추가 */
  toggleScope: (kind: ScopeKind, value: string) => void
  /** 특정 카테고리 비우기 */
  clearScopeKind: (kind: ScopeKind) => void
  /** 모든 카테고리 비우기 */
  clearAllScopes: () => void
  setMinInfluence: (n: number) => void
  setAliveFilter: (v: AliveFilter) => void
  setView: (v: PersonInfographicView) => void
  setQuery: (q: string) => void
  togglePin: (id: string) => void
  resetFilters: () => void
}

export const usePersonInfographicFilterStore =
  create<PersonInfographicFilterState>()(
    persist(
      (set) => ({
        scopes: EMPTY_SCOPES,
        minInfluence: 0,
        aliveFilter: 'all',
        view: 'cards',
        query: '',
        pinned: [],

        toggleScope: (kind, value) =>
          set((state) => {
            const cur = state.scopes[kind]
            const next = cur.includes(value)
              ? cur.filter((v) => v !== value)
              : [...cur, value]
            return { scopes: { ...state.scopes, [kind]: next } }
          }),
        clearScopeKind: (kind) =>
          set((state) => ({ scopes: { ...state.scopes, [kind]: [] } })),
        clearAllScopes: () => set({ scopes: EMPTY_SCOPES }),
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
            scopes: EMPTY_SCOPES,
            minInfluence: 0,
            aliveFilter: 'all',
            query: '',
          }),
      }),
      {
        name: 'person-infographic-filter',
        version: 2,
        // v1(scope: Scope) → v2(scopes: MultiScopes) 마이그레이션 — 단일 scope는 버림
        migrate: (persisted: unknown) => {
          const p =
            (persisted as {
              pinned?: string[]
              view?: PersonInfographicView
            }) ?? {}
          return {
            pinned: p.pinned ?? [],
            view: p.view ?? 'cards',
          } as Partial<PersonInfographicFilterState>
        },
        partialize: (state) => ({
          pinned: state.pinned,
          view: state.view,
        }),
      },
    ),
  )

/** scopes 안의 값 개수 합 — 활성 필터가 있는지 빠르게 판단 */
export function countActiveScopes(scopes: MultiScopes): number {
  return (
    scopes.era.length +
    scopes.region.length +
    scopes.field.length +
    scopes.country.length
  )
}

/** 헬퍼 — 카테고리 안 OR, 카테고리 간 AND로 사람 필터 */
export function matchesScopes<
  T extends {
    region: string
    field: string
    country: string
  },
>(
  person: T,
  scopes: MultiScopes,
  eraKeyOf: (person: T) => string,
): boolean {
  if (scopes.era.length > 0 && !scopes.era.includes(eraKeyOf(person))) return false
  if (scopes.region.length > 0 && !scopes.region.includes(person.region)) return false
  if (scopes.field.length > 0 && !scopes.field.includes(person.field)) return false
  if (scopes.country.length > 0 && !scopes.country.includes(person.country)) return false
  return true
}
