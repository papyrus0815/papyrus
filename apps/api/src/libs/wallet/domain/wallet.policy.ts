/**
 * 파피(구매형 가상화폐) 정책 상수 — 코드로 관리(point.policy.ts 대응).
 * 설계 문서: docs/papy-virtual-currency-design.md
 *
 * 환율/한도/운영자 목록을 바꾸려면 이 파일만 수정. 기존 거래는 WalletLedger(원장)에
 * 보존되며 Account.papyBalance는 원장 합계로 재계산되므로 변경은 신규 거래부터 적용.
 */

/**
 * 포인트→파피 환전 비율. N 포인트당 파피 1개.
 * 환전은 포인트를 "소각"하지 않는다(점수 원장 오염 금지 — 점수=명예 불변).
 * 대신 `floor(보유 totalPoints / POINTS_PER_PAPY)`를 누적 환전 상한으로 삼아,
 * 기여(점수)에 비례한 만큼만 파피로 받을 수 있게 한다.
 */
export const POINTS_PER_PAPY = 10

/** 일일 환전 상한(파피) — 단시간 대량 환전 억제용 rate limit */
export const DAILY_EXCHANGE_LIMIT_PAPY = 100

/**
 * 단일 거래 파피 금액 상한 — INT(signed 32-bit) 오버플로 및 하이퍼인플레이션 방지.
 * grant/promo/환전 등 모든 양수 입력 검증에 적용. INT_MAX(2_147_483_647)보다 충분히 작게.
 */
export const MAX_PAPY_AMOUNT = 100_000_000

/**
 * 운영자(파피 지급·프로모 생성·환불 권한) 계정 username 허용목록.
 * 이 프로젝트(web-admin)는 별도 역할 시스템이 없어(모든 로그인=신뢰된 편집자),
 * 경제를 망가뜨리는 grant/refund/promo만 username 허용목록으로 게이팅한다.
 * Phase 0 하드코딩 — 추후 config(env)로 이전 가능.
 */
export const OPERATOR_USERNAMES: readonly string[] = ['admin']

/** 보유 점수로 환전 가능한 누적 파피 상한 (소각 없이 기여 비례 상한) */
export function exchangeCapFromPoints(totalPoints: number): number {
  const safe = Number.isFinite(totalPoints) ? Math.max(0, totalPoints) : 0
  return Math.floor(safe / POINTS_PER_PAPY)
}
