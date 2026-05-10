import type { PinnedRow, YearRange } from '../model/types'

/**
 * 비교 상태를 JSON 파일로 내보내 백업·공유 — URL 길이 한계와 별도로,
 * 사건 오버레이까지 한 번에 묶어서 저장 가능.
 */
export function downloadComparisonJson(args: {
  rows: PinnedRow[]
  range: YearRange
  highlightYear: number | null
  eventOverlayIds: string[]
}) {
  const payload = {
    version: 'heads-of-state-comparison/v1',
    exportedAt: new Date().toISOString(),
    range: args.range,
    highlightYear: args.highlightYear,
    pins: args.rows.map((row) => ({
      rowId: row.rowId,
      segments: row.segments.map((s) => ({
        kind: s.kind,
        countryId: s.countryId,
        name: s.name,
      })),
    })),
    eventOverlayIds: args.eventOverlayIds,
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const dt = new Date().toISOString().slice(0, 10)
  a.download = `heads-of-state-${dt}.json`
  document.body.appendChild(a)
  a.click()
  setTimeout(() => {
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, 100)
}

/**
 * 인쇄·PDF 저장 진입 — 페이지에 print 트리거. 인쇄 전용 CSS는 페이지 스타일에 추가됨.
 */
export function printComparison() {
  if (typeof window !== 'undefined') {
    window.print()
  }
}
