/**
 * 직책 분류(PositionCategory)의 단일 출처.
 *
 * 수장 비교 타임라인의 색·범례, 그리고 (앞으로) 국가 상세·인물 상세의 대통령/총리/군주 구분이
 * 모두 이 함수를 기준으로 삼는다. 원래 `heads-of-state-timeline/lib/normalize-tenures.ts`의
 * 내부 `categorize`였던 로직을 엔티티로 승격해 한 곳에서 관리한다.
 */
import type { PositionCategory, TenureKind } from './types'

export interface CategorizePositionInput {
  /** 재위 전용 기록(SOVEREIGN_REIGN)이면 무조건 군주 */
  kind?: TenureKind | string | null
  positionType?: string | null
  positionTitle?: string | null
  appointmentMethod?: string | null
}

const PRESIDENT_TITLE_RE = /대통령|President|주석|Chairman|총통/i
const MONARCH_TITLE_RE =
  /국왕|왕\b|King|Queen|Emperor|황제|천황|여왕|Tsar|Czar|Sultan|Caliph|술탄|칼리프/i
const POPE_TITLE_RE = /교황|Pope/i

const MONARCH_METHODS = new Set(['HEREDITARY', 'SUCCESSION', 'COUP'])
const PRESIDENT_METHODS = new Set([
  'DIRECT_ELECTION',
  'INDIRECT_ELECTION',
  'PARLIAMENTARY_ELECTION',
])

/**
 * 분류 우선순위:
 *  1) 교황·칼리프 등 비국가 직책 — title 매칭(POPE). 군주 분기 전에 잡는다.
 *  2) SOVEREIGN_REIGN(재위 전용 테이블) → 무조건 MONARCH.
 *  3) ROYAL_NOBLE_TITLE → MONARCH (왕세자·대공 등).
 *  4) HEAD_OF_GOVERNMENT → PM (총리·수상).
 *  5) HEAD_OF_STATE → 임명방식 + title로 분기(세습/추대/쿠데타→군주, 선거→대통령, 그 외 title 매칭).
 *  6) 그 외 → OTHER.
 */
export function categorizePosition(
  input: CategorizePositionInput,
): PositionCategory {
  const title = input.positionTitle ?? ''

  if (POPE_TITLE_RE.test(title)) return 'POPE'
  if (input.kind === 'SOVEREIGN_REIGN') return 'MONARCH'

  const positionType = input.positionType ?? null
  if (positionType === 'ROYAL_NOBLE_TITLE') return 'MONARCH'
  if (positionType === 'HEAD_OF_GOVERNMENT') return 'PM'

  if (positionType === 'HEAD_OF_STATE') {
    const method = input.appointmentMethod ?? ''
    if (MONARCH_METHODS.has(method)) return 'MONARCH'
    if (PRESIDENT_METHODS.has(method)) return 'PRESIDENT'
    if (PRESIDENT_TITLE_RE.test(title)) return 'PRESIDENT'
    if (MONARCH_TITLE_RE.test(title)) return 'MONARCH'
    return 'OTHER'
  }

  return 'OTHER'
}
