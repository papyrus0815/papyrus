import type { PinnedRow, YearRange } from './types'

/**
 * 딥링크 URL 파라미터의 순수 파서·병합 규칙 모음.
 *
 * (훅 파일과 분리된 이유: use-heads-of-state-timeline-state의 import 체인이
 *  import.meta(api client)를 끌고 와 ts-jest에서 로드 불가 — 생산자(pathKeys)와의
 *  계약 테스트가 진짜 파서를 실행할 수 있도록 순수 모듈로 둔다.)
 */

/** URL `?year=` 값 — 부호 있는 연도(음수=BC) 허용 */
export function parseYearParam(raw: string | null): number | null {
  if (!raw) return null
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : null
}

/** URL `?range=` 값 (예: `1500-2030`, `-255~-202`) — endYear > startYear 아니면 무효 */
export function parseRangeParam(raw: string | null): YearRange | null {
  if (!raw) return null
  const match = raw.match(/^(-?\d{1,5})\s*[-_~]\s*(-?\d{1,5})$/)
  if (!match) return null
  const startYear = parseInt(match[1]!, 10)
  const endYear = parseInt(match[2]!, 10)
  if (!Number.isFinite(startYear) || !Number.isFinite(endYear) || endYear <= startYear) {
    return null
  }
  return { startYear, endYear }
}

/** URL `?pins=` 값 (예: `C:abc+H:def,C:ghi`) — 콤마=행, 플러스=행 안의 segment */
export function parsePinsParam(raw: string | null): string[][] | null {
  if (!raw) return null
  const groups = raw.split(',').map((group) => group.split('+').filter(Boolean))
  const nonEmpty = groups.filter((group) => group.length > 0)
  return nonEmpty
}

/**
 * URL `?pins=` 병합 규칙 (pure) — 보드가 비어있으면 교체, 이미 핀이 있으면
 * kind+countryId dedup 후 병합-추가. 인물·사건 상세에서 국가를 프리셋해 들어오는
 * 딥링크가 저장 핀 보드에 조용히 무시되지 않도록 한다. 변경 불필요면 null.
 * 행의 `transient` 플래그(세션 한정, localStorage 미저장)는 그대로 통과시킨다.
 */
export function mergeUrlPinRows(
  existingRows: PinnedRow[],
  urlRows: PinnedRow[],
): PinnedRow[] | null {
  if (urlRows.length === 0) return null
  if (existingRows.length === 0) return urlRows
  const alreadyPinned = new Set(
    existingRows.flatMap((row) =>
      row.segments.map((seg) => `${seg.kind}:${seg.countryId}`),
    ),
  )
  const appendRows = urlRows
    .map((row) => ({
      ...row,
      segments: row.segments.filter(
        (seg) => !alreadyPinned.has(`${seg.kind}:${seg.countryId}`),
      ),
    }))
    .filter((row) => row.segments.length > 0)
  if (appendRows.length === 0) return null
  return [...existingRows, ...appendRows]
}
