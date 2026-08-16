import { queryOptions, type QueryClient } from '@tanstack/react-query'

import { nestiaApiService } from '@/shared/api/api.service'
import { pathKeys } from '@/shared/router'
import * as api from '@api'

// ── SDK 생성 타입 ───────────────────────────────────────────────────────────
/** 유물 카탈로그 한 개 (보유 플래그 포함) */
export type Artifact = api.functional.artifacts.list.Output[number]
/** 보유 유물 (진열장) */
export type UserArtifact = api.functional.artifacts.collection.collection.Output[number]
/** 수집 결과 */
export type CollectResult = api.functional.artifacts.purchase.Output

const noRetryOn401 = (failureCount: number, error: Error) => {
  const status = (error as Error & { status?: number })?.status
  if (status === 401 || error?.message?.includes('401')) return false
  return failureCount < 1
}

// ── 조회 ─────────────────────────────────────────────────────────────────────
/** 유물 카탈로그 — GET /artifacts (setKey/rarity 필터 선택) */
export const artifactsQueryOptions = (filter?: { setKey?: string; rarity?: string }) =>
  queryOptions({
    queryKey: ['artifacts', 'list', filter?.setKey ?? null, filter?.rarity ?? null] as const,
    queryFn: async () => {
      const conn = nestiaApiService.getConnection()
      return api.functional.artifacts.list(conn, filter?.setKey, filter?.rarity)
    },
    staleTime: 1000 * 60,
    retry: noRetryOn401,
  })

/** 내 수집(진열장) — GET /artifacts/collection */
export const myCollectionQueryOptions = queryOptions({
  queryKey: ['artifacts', 'collection'] as const,
  queryFn: async () => {
    const conn = nestiaApiService.getConnection()
    if (!conn.headers?.Authorization) throw new Error('No authorization token')
    return api.functional.artifacts.collection.collection(conn)
  },
  staleTime: 1000 * 30,
  retry: noRetryOn401,
})

/** 방문: 타 계정 진열장(진열분만, 읽기전용) — GET /artifacts/collection/:accountId */
export const visitedCollectionQueryOptions = (accountId: string) =>
  queryOptions({
    queryKey: ['artifacts', 'collection', 'visited', accountId] as const,
    queryFn: async () => {
      const conn = nestiaApiService.getConnection()
      return api.functional.artifacts.collection.visitedCollection(conn, accountId)
    },
    staleTime: 1000 * 30,
    retry: noRetryOn401,
    enabled: !!accountId,
  })

/** 유물 카탈로그·수집 캐시 무효화 (구매/진열 후) */
export function invalidateArtifacts(queryClient: QueryClient): void {
  queryClient.invalidateQueries({ queryKey: ['artifacts'] })
}

// ── 변경(뮤테이션) ───────────────────────────────────────────────────────────
/** 멱등 키 생성 */
export function newRequestId(): string {
  return crypto.randomUUID()
}

/** 유물 구매 (파피 소비) */
export async function purchaseArtifact(artifactId: string, requestId: string): Promise<CollectResult> {
  const conn = nestiaApiService.getConnection()
  return api.functional.artifacts.purchase(conn, { artifactId, requestId })
}

/** 진열장 노출 토글 */
export async function setArtifactDisplay(userArtifactId: string, displayed: boolean): Promise<UserArtifact> {
  const conn = nestiaApiService.getConnection()
  return api.functional.artifacts.display(conn, { userArtifactId, displayed })
}

// ── 레어도 / 링크 메타 ───────────────────────────────────────────────────────
export const RARITY_META: Record<string, { label: string; color: string }> = {
  COMMON: { label: '일반', color: '#64748b' },
  RARE: { label: '보물', color: '#2563eb' },
  LEGENDARY: { label: '국보급', color: '#a855f7' },
}

export function rarityMeta(rarity: string): { label: string; color: string } {
  return RARITY_META[rarity] ?? { label: rarity, color: '#64748b' }
}

const LINKED_TYPE_LABEL: Record<string, string> = {
  PERSON: '인물',
  EVENT: '사건',
  COMPANY: '기업',
  COUNTRY: '국가',
  HISTORICAL_COUNTRY: '역사국가',
  NAVAL_VESSEL: '함선',
  WEAPON: '무기',
  DYNASTY: '가문',
  RESOURCE: '자원',
  CURRENCY: '화폐',
  RELIGION: '종교',
}

/** 연결 엔티티 타입 라벨 (없으면 null) */
export function linkedTypeLabel(type: string | null): string | null {
  if (!type) return null
  return LINKED_TYPE_LABEL[type] ?? type
}

/** 연결 엔티티 백과 딥링크 경로 (라우트 없는 타입은 null → 비클릭 칩) */
export function linkedEntityPath(type: string | null, id: string | null): string | null {
  if (!type || !id) return null
  switch (type) {
    case 'PERSON':
      return pathKeys.personsTimelineDetail(id)
    case 'EVENT':
      return pathKeys.events.detail(id)
    case 'COMPANY':
      return pathKeys.companies.detail(id)
    case 'COUNTRY':
      return pathKeys.countryDetail(id)
    default:
      return null
  }
}
