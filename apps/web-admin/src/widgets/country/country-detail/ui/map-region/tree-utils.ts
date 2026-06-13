/**
 * 행정구역 트리 순수 헬퍼 — 뷰/폼 모달에서 공용.
 *
 * 이전에 map-region-administrative-view.tsx와 admin-division-form-modal.tsx에
 * 각각 중복 정의돼 있던 findInTree 등을 한곳으로 모았다.
 */
import type { AdministrativeDivision } from '@/entities/country/api.administrative-divisions'
import { dateSortKey, parseIsoDateParts } from '@/shared/lib/iso-date'

/** path(ids)를 따라가며 각 단계의 노드를 모은다. 못 찾으면 거기서 멈춤. */
export function resolvePath(
  roots: AdministrativeDivision[],
  ids: string[],
): AdministrativeDivision[] {
  const result: AdministrativeDivision[] = []
  let cursor = roots
  for (const id of ids) {
    const found = cursor.find((d) => d.id === id)
    if (!found) break
    result.push(found)
    cursor = found.children ?? []
  }
  return result
}

/** 트리 어디든 id로 노드 찾기 (재귀) */
export function findInTree(
  roots: AdministrativeDivision[],
  id: string,
): AdministrativeDivision | null {
  for (const node of roots) {
    if (node.id === id) return node
    if (node.children?.length) {
      const f = findInTree(node.children, id)
      if (f) return f
    }
  }
  return null
}

/** 폐지일이 지난 구역인지. 네이티브 Date는 기원전(음수 연도) 문자열을 NaN으로 떨궈 못 쓴다 */
export function isAbolished(d: AdministrativeDivision): boolean {
  const abolished = dateSortKey(d.abolishedDate)
  if (abolished == null) return false
  const today = dateSortKey(new Date().toISOString())
  return today != null && abolished <= today
}

/** 직·간접 하위 구역 개수 */
export function countDescendants(node: AdministrativeDivision): number {
  let n = 0
  for (const c of node.children ?? []) {
    n += 1 + countDescendants(c)
  }
  return n
}

/** 노드+모든 자손에 대해 pick 값을 합산 (삭제 영향 범위 계산용) */
export function sumSubtree(
  node: AdministrativeDivision,
  pick: (n: AdministrativeDivision) => number,
): number {
  let total = pick(node)
  for (const c of node.children ?? []) total += sumSubtree(c, pick)
  return total
}

/**
 * 체계 시행 기간 표시 — "1413–1895" / "1896–현행" / "기원전 412–기원전 330" / "기간 미상".
 * 네이티브 Date는 BC 형식("-0412-…")을 NaN으로 떨궈서 parseIsoDateParts로 직접 파싱.
 */
export function formatYearRange(
  startIso: string | null | undefined,
  endIso: string | null | undefined,
): string {
  if (!startIso && !endIso) return '기간 미상'
  const year = (iso: string) => {
    const p = parseIsoDateParts(iso)
    if (!p) return '?'
    return p.year < 0 ? `기원전 ${Math.abs(p.year)}` : String(p.year)
  }
  const s = startIso ? year(startIso) : '?'
  const e = endIso ? year(endIso) : '현행'
  return `${s}–${e}`
}
