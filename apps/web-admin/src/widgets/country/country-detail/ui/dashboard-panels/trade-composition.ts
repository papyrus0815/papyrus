/**
 * 교역 구성 막대의 계산 — "무엇 위주의 나라인가"를 **모수를 속이지 않고** 내놓는다.
 *
 * 별도 파일인 이유: 이 섹션에서 가장 크게 틀렸던 자리라 테스트로 못을 박아 둔다.
 * 옛 막대는 등록된 품목만 모아 100%로 늘여 그렸다. 미국 2024년 수출은 등록 품목이
 * 29.5%뿐인데 막대에는 '에너지·광물 44%'로 찍혔고(실제 12.9%), 바로 아래 칩에는
 * 전체 대비 5.7%가 적혀 있었다 — 모수가 다른 두 수가 나란히 놓이면 읽는 사람은
 * 큰 쪽으로 읽는다.
 */
import { categoryColor } from '@/entities/trade/vocab'

/** 계산에 필요한 만큼만 — 응답 DTO 전체에 묶이지 않게 좁혀 받는다 */
export interface CompositionItem {
  id?: string
  name: string
  grain: 'COMMODITY' | 'PARTNER' | 'PARTNER_COMMODITY'
  commodityId?: string | null
  sharePct?: number | string | null
  value?: number | string | null
  categoryId?: string | null
  categoryName?: string | null
  categoryColorKey?: string | null
  rootCategoryId?: string | null
  rootCategoryName?: string | null
  rootCategoryColorKey?: string | null
}

export interface CompositionSlice {
  key: string
  name: string
  color: string
  /** 방향 전체 대비 비중. `relative`면 등록분 안에서의 비율 */
  pct: number
}

export interface CompositionResult {
  slices: CompositionSlice[]
  /** 등록 품목이 그 방향의 몇 %를 덮는가. 전체 대비를 말할 수 없으면 null */
  coverage: number | null
  /** 크기를 몰라 막대에 못 올린 행 수 */
  unknownCount: number
  /** true면 막대는 등록분끼리의 비율 — 전체 대비가 아니다 */
  relative: boolean
}

function toNumber(value: unknown): number | null {
  if (value == null || value === '') return null
  const numeric = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

/**
 * 한 행이 그 방향에서 차지하는 비중(%).
 *
 * 자료가 비중을 직접 적어 주면 그걸 쓰고, 금액만 있으면 그 해 총액으로 나눠 구한다
 * (품목 금액과 총액은 같은 단위·배율이라 그대로 나뉜다). 둘 다 없으면 **모른다** —
 * 0으로 채우지 않는다. 모르는 값을 0으로 그리면 "그 품목은 없었다"는 거짓말이 된다.
 */
export function shareOf(
  item: CompositionItem,
  directionTotal: number | null,
): number | null {
  const declared = toNumber(item.sharePct)
  if (declared != null) return declared
  const value = toNumber(item.value)
  if (value != null && directionTotal != null && directionTotal > 0) {
    return (value / directionTotal) * 100
  }
  return null
}

/**
 * 막대에 올릴 행 고르기.
 *
 * 단면(grain)이 다른 행을 섞으면 같은 무역을 두 번 셀 수 있다. 다만 상대×품목을
 * 통째로 빼면 그 단면만 쓴 자료(조선 1890은 일곱 줄이 모두 상대×품목이다)에서 막대가
 * 통째로 사라진다. 실제로 겹치는 건 **같은 품목이 두 단면에 다 있는 경우**뿐이다.
 */
export function barRowsOf<T extends CompositionItem>(items: T[]): T[] {
  const identityOf = (item: CompositionItem) => item.commodityId ?? item.name
  const plain = items.filter((item) => item.grain === 'COMMODITY')
  const plainIds = new Set(plain.map(identityOf))
  return [
    ...plain,
    ...items.filter(
      (item) =>
        item.grain === 'PARTNER_COMMODITY' && !plainIds.has(identityOf(item)),
    ),
  ]
}

/**
 * 대분류로 묶은 구성.
 *
 * 중분류는 대분류 색을 물려받아 형제끼리 색이 같으므로(자동차·선박이 둘 다 '운송장비'
 * 색) 중분류로 그리면 막대를 읽을 수 없다. "무엇 위주의 나라인가"도 원래 대분류
 * 단위 질문이다.
 */
export function buildComposition(
  items: CompositionItem[],
  directionTotal: number | null,
  isDark = false,
): CompositionResult {
  const groups = new Map<string, CompositionSlice>()
  let known = 0
  let unknownCount = 0

  for (const item of barRowsOf(items)) {
    const share = shareOf(item, directionTotal)
    if (share == null || share <= 0) {
      unknownCount += 1
      continue
    }
    known += share
    const key = item.rootCategoryId ?? item.categoryId ?? '기타'
    const existing = groups.get(key)
    if (existing) {
      existing.pct += share
      continue
    }
    groups.set(key, {
      key,
      name: item.rootCategoryName ?? item.categoryName ?? '분류 없음',
      color: categoryColor(
        item.rootCategoryColorKey ?? item.categoryColorKey,
        isDark,
      ),
      pct: share,
    })
  }

  const slices = [...groups.values()].sort((left, right) => right.pct - left.pct)

  /*
   * 비중을 아는 행이 하나도 없거나 합이 100을 넘으면(자료가 어긋난 것) "전체 대비 몇
   * %"라고 말할 수 없다. **그때만** 등록분 안의 비율로 되돌린다 — 일부라도 아는 값이
   * 있으면 그 진짜 값을 그대로 그리고, 모르는 행 수를 따로 밝힌다.
   */
  const absolute = slices.length > 0 && known > 0 && known <= 100.5
  if (!absolute && slices.length > 0) {
    const sum = slices.reduce((acc, slice) => acc + slice.pct, 0)
    for (const slice of slices) slice.pct = (slice.pct / sum) * 100
  }

  return {
    slices,
    coverage: absolute ? known : null,
    unknownCount,
    relative: !absolute,
  }
}
