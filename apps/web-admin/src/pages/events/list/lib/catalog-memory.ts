/**
 * 사건 목록 설정 기억 — 다른 지면에 다녀와도 필터·정렬·접힘이 그대로 남게 한다.
 *
 * 필터·검색·정렬·세기·앵커 스코프는 **URL에만** 살고 있었다. 좌측 레일의 '사건' 링크는
 * 맨 `/events`로 가므로, 인물·국가를 보고 돌아올 때마다 전부 기본값으로 초기화됐다
 * (사용자 지적: "계속 다른 곳 갔다 오니 초기화되네"). 세기·연 접힘은 컴포넌트 state라
 * 방문마다 사라졌다.
 *
 * 규약
 * - 쿼리는 **바뀔 때마다** 저장한다(빈 쿼리 포함) — 사용자가 필터를 전부 풀었으면
 *   '전부 푼 상태'가 기억돼야 한다.
 * - 복원은 **맨 `/events`로 들어올 때만**. 쿼리를 싣고 오는 링크(국가 지면의
 *   `?country=…`, 뒤로가기)는 그 쿼리가 이긴다.
 * - `event`(열린 사건 드로어)는 설정이 아니라 순간이라 기억하지 않는다.
 * - 저장소는 localStorage — 막히거나(사파리 사생활 모드) 깨진 값이면 조용히 기본값.
 */

export const CATALOG_QUERY_KEY = 'papyrus.events.lastQuery'
export const CATALOG_COLLAPSED_KEY = 'papyrus.events.collapsed'

/** 기억하지 않는 파라미터 */
const TRANSIENT_PARAMS = ['event']

export function toRememberedQuery(searchParams: URLSearchParams): string {
  const next = new URLSearchParams(searchParams)
  TRANSIENT_PARAMS.forEach((key) => next.delete(key))
  return next.toString()
}

export function saveCatalogQuery(searchParams: URLSearchParams): void {
  try {
    window.localStorage.setItem(
      CATALOG_QUERY_KEY,
      toRememberedQuery(searchParams),
    )
  } catch {
    /* 저장소 막힘 — 기억 없이 동작 */
  }
}

/** 맨 `/events` 진입 시 되돌아갈 쿼리 — 없거나 빈 쿼리면 null */
export function readCatalogQuery(): string | null {
  try {
    const saved = window.localStorage.getItem(CATALOG_QUERY_KEY)
    return saved ? saved : null
  } catch {
    return null
  }
}

export interface CollapsedBands {
  years: number[]
  centuries: number[]
}

const isIntArray = (value: unknown): value is number[] =>
  Array.isArray(value) && value.every((item) => Number.isInteger(item))

export function readCollapsedBands(): CollapsedBands {
  try {
    const raw = window.localStorage.getItem(CATALOG_COLLAPSED_KEY)
    if (!raw) return { years: [], centuries: [] }
    const parsed: unknown = JSON.parse(raw)
    const record = (parsed ?? {}) as Record<string, unknown>
    return {
      years: isIntArray(record.years) ? record.years : [],
      centuries: isIntArray(record.centuries) ? record.centuries : [],
    }
  } catch {
    return { years: [], centuries: [] }
  }
}

export function saveCollapsedBands(bands: {
  years: Iterable<number>
  centuries: Iterable<number>
}): void {
  try {
    const years = [...bands.years]
    const centuries = [...bands.centuries]
    if (years.length === 0 && centuries.length === 0)
      window.localStorage.removeItem(CATALOG_COLLAPSED_KEY)
    else
      window.localStorage.setItem(
        CATALOG_COLLAPSED_KEY,
        JSON.stringify({ years, centuries }),
      )
  } catch {
    /* 저장소 막힘 — 기억 없이 동작 */
  }
}
