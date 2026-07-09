/**
 * usePinnedRows — transient(딥링크 세션 한정) 행의 영속화 규칙 특성화.
 *
 *  - transient 행은 localStorage에 저장되지 않는다 (호기심 딥링크 방문이
 *    사용자의 저장 핀 보드를 영구 변경하지 않도록 — 적대 리뷰 P2의 수리).
 *  - 사용자가 보드를 직접 조작하는 순간 transient 행은 채택되어 저장된다.
 */
import { act, renderHook } from '@testing-library/react'

import { usePinnedRows } from '@/widgets/heads-of-state-timeline/model/use-pinned-rows'
import type {
  PinnedRow,
  PinnedSegment,
} from '@/widgets/heads-of-state-timeline/model/types'

const STORAGE_KEY = 'heads-of-state-timeline:pinned-rows:v2'

function storedRows(): PinnedRow[] {
  return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]')
}

function segmentOf(countryId: string): PinnedSegment {
  return {
    segmentId: `seg-${countryId}`,
    kind: 'HISTORICAL',
    countryId,
    name: countryId,
    flagEmoji: null,
    lifespanStartYear: null,
    lifespanEndYear: null,
  }
}

beforeEach(() => {
  window.localStorage.clear()
})

describe('usePinnedRows — transient 행 영속화 규칙', () => {
  it('transient 행은 화면엔 있지만 localStorage에 저장되지 않는다', () => {
    const { result } = renderHook(() => usePinnedRows())
    act(() => {
      result.current.replaceAll([
        { rowId: 'u1', segments: [segmentOf('joseon')], transient: true },
      ])
    })
    expect(result.current.rows).toHaveLength(1)
    expect(storedRows()).toHaveLength(0)
  })

  it('durable 행과 섞이면 durable만 저장된다 (병합 딥링크 시나리오)', () => {
    const { result } = renderHook(() => usePinnedRows())
    act(() => {
      result.current.replaceAll([
        { rowId: 'r1', segments: [segmentOf('ming')] },
        { rowId: 'u1', segments: [segmentOf('joseon')], transient: true },
      ])
    })
    expect(result.current.rows).toHaveLength(2)
    const stored = storedRows()
    expect(stored).toHaveLength(1)
    expect(stored[0]!.segments[0]!.countryId).toBe('ming')
  })

  it('사용자 조작(새 행 추가)이 transient 행을 채택해 함께 저장한다', () => {
    const { result } = renderHook(() => usePinnedRows())
    act(() => {
      result.current.replaceAll([
        { rowId: 'u1', segments: [segmentOf('joseon')], transient: true },
      ])
    })
    act(() => {
      result.current.addRow({
        kind: 'HISTORICAL',
        countryId: 'qing',
        name: 'qing',
        flagEmoji: null,
        lifespanStartYear: null,
        lifespanEndYear: null,
      })
    })
    const stored = storedRows()
    expect(stored).toHaveLength(2)
    expect(stored.map((row) => row.segments[0]!.countryId).sort()).toEqual([
      'joseon',
      'qing',
    ])
  })

  it('transient 행 자체를 제거하면 저장소도 그대로 비어있다', () => {
    const { result } = renderHook(() => usePinnedRows())
    act(() => {
      result.current.replaceAll([
        { rowId: 'u1', segments: [segmentOf('joseon')], transient: true },
      ])
    })
    act(() => {
      result.current.removeRow(result.current.rows[0]!.rowId)
    })
    expect(result.current.rows).toHaveLength(0)
    expect(storedRows()).toHaveLength(0)
  })

  it('저장된 보드를 다시 읽으면 transient 플래그 없는 durable 행만 복원된다', () => {
    const first = renderHook(() => usePinnedRows())
    act(() => {
      first.result.current.replaceAll([
        { rowId: 'r1', segments: [segmentOf('ming')] },
        { rowId: 'u1', segments: [segmentOf('joseon')], transient: true },
      ])
    })
    first.unmount()

    const second = renderHook(() => usePinnedRows())
    expect(second.result.current.rows).toHaveLength(1)
    expect(second.result.current.rows[0]!.segments[0]!.countryId).toBe('ming')
    expect(second.result.current.rows[0]!.transient).toBeUndefined()
  })
})
