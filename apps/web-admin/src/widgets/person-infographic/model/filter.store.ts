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

/** 인물 정렬 기준 — 모든 뷰에서 공유. */
export type PersonSortKey = 'influence' | 'name' | 'year' | 'deathYear'

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
  /** 인물 정렬 기준 — 매트릭스/갤럭시/스토리/왕조 공통 */
  sort: PersonSortKey
  /** 좋아요 고정 인물 (localStorage로 유지) */
  pinned: string[]

  /** 한 번에 여러 필드를 갱신 — URL → store 동기화에서 사용 (single render) */
  setMany: (
    patch: Partial<
      Pick<
        PersonInfographicFilterState,
        'scopes' | 'minInfluence' | 'aliveFilter' | 'view' | 'query' | 'sort'
      >
    >,
  ) => void

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
  setSort: (s: PersonSortKey) => void
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
        sort: 'influence',
        pinned: [],

        setMany: (patch) => set(patch),
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
        setSort: (sort) => set({ sort }),
        togglePin: (id) =>
          set((state) => ({
            pinned: state.pinned.includes(id)
              ? state.pinned.filter((x) => x !== id)
              : [...state.pinned, id],
          })),
        // 필터(scope·영향력·생존·검색어)만 해제 — sort는 표시 환경설정이라 보존
        // (useHasActiveFilter가 sort를 필터로 세지 않으므로 CTA 의미와 일치)
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

/**
 * 활성 필터(scope·영향력·생존·검색어) 존재 여부 — 빈 결과의 "필터 초기화" CTA 노출 판정 공통.
 * 갤럭시/매트릭스의 점 강조(isActive)는 scope 한정이라 별도(hasAnyActiveScope)를 그대로 쓴다.
 */
export function useHasActiveFilter(): boolean {
  return usePersonInfographicFilterStore((s) => {
    const sc = s.scopes
    return (
      sc.era.length +
        sc.region.length +
        sc.field.length +
        sc.country.length +
        (s.minInfluence > 0 ? 1 : 0) +
        (s.aliveFilter !== 'all' ? 1 : 0) +
        (s.query.trim() ? 1 : 0) >
      0
    )
  })
}
