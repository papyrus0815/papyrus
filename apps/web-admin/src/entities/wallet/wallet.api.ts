import { queryOptions, type QueryClient } from '@tanstack/react-query'

import { nestiaApiService } from '@/shared/api/api.service'
import * as api from '@api'

// ── SDK 생성 타입 ───────────────────────────────────────────────────────────
/** 내 지갑 요약 (잔액·환전 가능량·최근 거래) */
export type WalletView = api.functional.wallet.me.Output
/** 원장 한 줄 */
export type WalletLedgerEntry = WalletView['recent'][number]
/** 상점 상품 (보유·장착 플래그 포함) */
export type ShopItem = api.functional.wallet.shop.shop.Output[number]
/** 보유 아이템 (인벤토리) */
export type UserItem = api.functional.wallet.items.items.Output[number]
/** 방문: 타 계정 장착 코스메틱(축약) */
export type EquippedCosmetic = api.functional.wallet.equipped.equippedOf.Output[number]
/** 구매 결과 */
export type PurchaseResult = api.functional.wallet.shop.purchase.Output
/** 코스메틱 카테고리 코드 */
export type ItemCategory = ShopItem['category']

const noRetryOn401 = (failureCount: number, error: Error) => {
  const status = (error as Error & { status?: number })?.status
  if (status === 401 || error?.message?.includes('401')) return false
  return failureCount < 1
}

// ── 조회 쿼리 ────────────────────────────────────────────────────────────────
/** 내 지갑 — GET /wallet/me */
export const walletMeQueryOptions = queryOptions({
  queryKey: ['wallet', 'me'] as const,
  queryFn: async () => {
    const conn = nestiaApiService.getConnection()
    if (!conn.headers?.Authorization) throw new Error('No authorization token')
    return api.functional.wallet.me(conn)
  },
  staleTime: 1000 * 30,
  retry: noRetryOn401,
})

/** 상점 상품 목록 — GET /wallet/shop (category 선택) */
export const walletShopQueryOptions = (category?: ItemCategory) =>
  queryOptions({
    queryKey: ['wallet', 'shop', category ?? 'all'] as const,
    queryFn: async () => {
      const conn = nestiaApiService.getConnection()
      return api.functional.wallet.shop.shop(conn, category)
    },
    staleTime: 1000 * 60,
    retry: noRetryOn401,
  })

/** 내 보유 아이템 — GET /wallet/items */
export const walletItemsQueryOptions = queryOptions({
  queryKey: ['wallet', 'items'] as const,
  queryFn: async () => {
    const conn = nestiaApiService.getConnection()
    if (!conn.headers?.Authorization) throw new Error('No authorization token')
    return api.functional.wallet.items.items(conn)
  },
  staleTime: 1000 * 30,
  retry: noRetryOn401,
})

/** 방문: 타 계정 장착 코스메틱(스킨, 읽기전용) — GET /wallet/equipped/:accountId */
export const visitedCosmeticsQueryOptions = (accountId: string) =>
  queryOptions({
    queryKey: ['wallet', 'equipped', 'visited', accountId] as const,
    queryFn: async () => {
      const conn = nestiaApiService.getConnection()
      return api.functional.wallet.equipped.equippedOf(conn, accountId)
    },
    staleTime: 1000 * 30,
    retry: noRetryOn401,
    enabled: !!accountId,
  })

/** 지갑·상점·인벤토리 캐시 일괄 무효화 (구매/환전/장착 후) */
export function invalidateWallet(queryClient: QueryClient): void {
  queryClient.invalidateQueries({ queryKey: ['wallet'] })
}

// ── 변경(뮤테이션) 래퍼 ──────────────────────────────────────────────────────
/** 멱등 키 생성 (액션마다 새 UUID) */
export function newRequestId(): string {
  return crypto.randomUUID()
}

/** 포인트→파피 환전 */
export async function exchangePapy(papy: number, requestId: string): Promise<WalletView> {
  const conn = nestiaApiService.getConnection()
  return api.functional.wallet.exchange(conn, { papy, requestId })
}

/** 프로모 코드 교환 */
export async function redeemPromo(code: string): Promise<WalletView> {
  const conn = nestiaApiService.getConnection()
  return api.functional.wallet.redeem(conn, { code })
}

/** 상품 구매 (파피 소비) */
export async function purchaseShopItem(
  itemId: string,
  requestId: string,
): Promise<PurchaseResult> {
  const conn = nestiaApiService.getConnection()
  return api.functional.wallet.shop.purchase(conn, { itemId, requestId })
}

/** 아이템 장착/해제 */
export async function equipUserItem(userItemId: string, equipped: boolean): Promise<UserItem> {
  const conn = nestiaApiService.getConnection()
  return api.functional.wallet.items.equip(conn, { userItemId, equipped })
}
