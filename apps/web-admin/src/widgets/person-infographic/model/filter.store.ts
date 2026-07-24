import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { MAX_RECORD_PERSONS } from './records-compare'

export type PersonInfographicView =
  | 'cards'
  | 'matrix'
  | 'galaxy'
  | 'story'
  | 'dynasty'
  | 'stats'
  | 'records'

export type AliveFilter = 'all' | 'alive' | 'dead'

export type ScopeKind = 'era' | 'region' | 'field' | 'country'

/** 인물 정렬 기준 — 카드 그리드 뷰(스토리·왕조)의 그룹 내부 인물 순서. */
export type PersonSortKey = 'influence' | 'name' | 'year' | 'deathYear'

/** 시대 스토리 세기 그룹의 시간축 방향 — 'desc'=최신 세기 먼저(기본), 'asc'=오래된 세기 먼저. */
export type EraGroupOrder = 'asc' | 'desc'

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
  /** 인물 정렬 기준 — 카드 그리드 뷰(스토리·왕조)의 그룹 내부 순서 */
  sort: PersonSortKey
  /** 시대 스토리 세기 그룹 나열 방향 — 최신순(기본)/오래된순 */
  eraGroupOrder: EraGroupOrder
  /** 좋아요 고정 인물 (localStorage로 유지) */
  pinned: string[]

  /** 기록 비교 뷰 — 비교 대상 인물 id (URL recordPersonIds 동기화, 최대 12명) */
  recordPersonIds: string[]
  /** 기록 비교 기간 — 부호 연도(BC 음수), from 포함 / to 배타. null이면 전 기간 */
  recordFromYear: number | null
  recordToYear: number | null

  /** 한 번에 여러 필드를 갱신 — URL → store 동기화에서 사용 (single render) */
  setMany: (
    patch: Partial<
      Pick<
        PersonInfographicFilterState,
        | 'scopes'
        | 'minInfluence'
        | 'aliveFilter'
        | 'view'
        | 'query'
        | 'sort'
        | 'eraGroupOrder'
        | 'recordPersonIds'
        | 'recordFromYear'
        | 'recordToYear'
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
  setEraGroupOrder: (order: EraGroupOrder) => void
  togglePin: (id: string) => void
  resetFilters: () => void

  /** 기록 비교 — 인물 추가(중복·정원 초과는 무시) */
  addRecordPersonId: (id: string) => void
  removeRecordPersonId: (id: string) => void
  /** 기록 비교 기간 설정 — 둘 다 null이면 전 기간 */
  setRecordYearRange: (fromYear: number | null, toYear: number | null) => void
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
        eraGroupOrder: 'desc',
        pinned: [],
        recordPersonIds: [],
        recordFromYear: null,
        recordToYear: null,

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
        setEraGroupOrder: (eraGroupOrder) => set({ eraGroupOrder }),
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

        addRecordPersonId: (id) =>
          set((state) => {
            if (
              state.recordPersonIds.includes(id) ||
              state.recordPersonIds.length >= MAX_RECORD_PERSONS
            ) {
              return state
            }
            return { recordPersonIds: [...state.recordPersonIds, id] }
          }),
        removeRecordPersonId: (id) =>
          set((state) => ({
            recordPersonIds: state.recordPersonIds.filter(
              (personId) => personId !== id,
            ),
          })),
        setRecordYearRange: (fromYear, toYear) =>
          set({ recordFromYear: fromYear, recordToYear: toYear }),
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
        // sort·eraGroupOrder도 표시 환경설정이라 view와 함께 유지(새로고침 시 선택 보존).
        partialize: (state) => ({
          pinned: state.pinned,
          view: state.view,
          sort: state.sort,
          eraGroupOrder: state.eraGroupOrder,
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
  return usePersonInfographicFilterStore(
    (state) =>
      countActiveScopes(state.scopes) +
        (state.minInfluence > 0 ? 1 : 0) +
        (state.aliveFilter !== 'all' ? 1 : 0) +
        (state.query.trim() ? 1 : 0) >
      0,
  )
}
