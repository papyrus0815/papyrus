/**
 * useUndoablePatch 키보드 언두(Ctrl/Cmd+Z) 테스트 — P3-16.
 * 저장 후 유효 inverse가 있으면 편집 필드 밖 Ctrl+Z로 되돌리고, 텍스트 편집 필드 안에서는
 * 네이티브 언두에 양보(가로채지 않음).
 */
import { act, fireEvent, renderHook } from '@testing-library/react'

// 토스트는 react-hot-toast 렌더가 필요 없으니 목킹 — show/dismiss만 관찰.
jest.mock('@/shared/ui/toast', () => ({
  notify: { show: jest.fn(() => 'toast-id'), dismiss: jest.fn() },
}))

import { buildInverse, useUndoablePatch } from './use-undoable-patch'
import { type EventDetail } from './use-event-detail'

type Patch = Parameters<typeof buildInverse>[1]

const EVENT = { id: 'E', title: '루트 사건' } as EventDetail

/** onSuccess를 즉시 호출하는 mock mutate — 토스트/pending 등록 경로를 태운다. */
function makeMutate() {
  return jest.fn(
    (_patch: unknown, opts?: { onSuccess?: () => void }) => opts?.onSuccess?.(),
  )
}

describe('useUndoablePatch — 키보드 언두(Ctrl/Cmd+Z)', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    document.body.innerHTML = ''
  })
  afterEach(() => {
    jest.clearAllTimers()
    jest.useRealTimers()
  })

  it('저장 후 Ctrl+Z로 inverse patch를 mutate한다', () => {
    const mutate = makeMutate()
    const { result } = renderHook(() =>
      useUndoablePatch({ event: EVENT, mutate }),
    )

    // 제목 변경 patch 저장 → onSuccess가 pending inverse 등록
    act(() => result.current({ title: '새 제목' }))
    expect(mutate).toHaveBeenCalledTimes(1)

    // 편집 필드 밖에서 Ctrl+Z
    act(() => {
      fireEvent.keyDown(document.body, { key: 'z', ctrlKey: true })
    })

    // inverse(원래 제목)로 두 번째 mutate 호출
    expect(mutate).toHaveBeenCalledTimes(2)
    expect(mutate.mock.calls[1][0]).toMatchObject({ title: '루트 사건' })
  })

  it('입력 필드 안에서는 Ctrl+Z를 가로채지 않는다(네이티브 텍스트 언두 양보)', () => {
    const mutate = makeMutate()
    const { result } = renderHook(() =>
      useUndoablePatch({ event: EVENT, mutate }),
    )
    act(() => result.current({ title: '새 제목' }))
    expect(mutate).toHaveBeenCalledTimes(1)

    const input = document.createElement('input')
    document.body.appendChild(input)
    input.focus()

    act(() => {
      fireEvent.keyDown(input, { key: 'z', ctrlKey: true })
    })

    // 편집 필드라 언두 미발동 — 여전히 1회
    expect(mutate).toHaveBeenCalledTimes(1)
  })

  it('저장이 없으면(대기 inverse 없음) Ctrl+Z는 무동작', () => {
    const mutate = makeMutate()
    renderHook(() => useUndoablePatch({ event: EVENT, mutate }))
    act(() => {
      fireEvent.keyDown(document.body, { key: 'z', ctrlKey: true })
    })
    expect(mutate).not.toHaveBeenCalled()
  })

  it('Shift+Ctrl+Z(리두)는 언두를 트리거하지 않는다', () => {
    const mutate = makeMutate()
    const { result } = renderHook(() =>
      useUndoablePatch({ event: EVENT, mutate }),
    )
    act(() => result.current({ title: '새 제목' }))
    act(() => {
      fireEvent.keyDown(document.body, { key: 'z', ctrlKey: true, shiftKey: true })
    })
    expect(mutate).toHaveBeenCalledTimes(1)
  })
})

describe('buildInverse — 연결 사유(parentLinkReasons·childLinkReasons)', () => {
  // 사유는 쌍의 속성 — 주 상위(parentLinkReason)·추가 상위(extraParents[].reason)·
  // 하위(childEvents/extraChildren[].reason) 슬롯별로 이전 값을 역직렬화해야 한다.
  const event = {
    id: 'E',
    title: '루트 사건',
    parentEventId: 'P1',
    parentLinkReason: '주 상위 옛 사유',
    extraParents: [{ id: 'P2', title: '추가 상위', reason: '엣지 옛 사유' }],
    childEvents: [{ id: 'C1', title: '자식', reason: '자식 옛 사유' }] as EventDetail[],
    extraChildren: [{ id: 'C2', title: '역방향 자식', reason: '역방향 옛 사유' }],
  } as EventDetail

  it('parentLinkReasons: 쌍 위치별 이전 값 복원 — 없던 사유의 undo는 null(행 삭제) 명시', () => {
    const inverse = buildInverse(event, {
      parentLinkReasons: [
        { parentEventId: 'P1', reason: '새 사유' },
        { parentEventId: 'P2', reason: '' },
        { parentEventId: 'P9', reason: '처음 쓰는 사유' },
      ],
    } as unknown as Patch)
    expect(inverse.parentLinkReasons).toEqual([
      { parentEventId: 'P1', reason: '주 상위 옛 사유' },
      { parentEventId: 'P2', reason: '엣지 옛 사유' },
      { parentEventId: 'P9', reason: null },
    ])
  })

  it('행 삭제(reason:null) patch의 inverse는 이전 문자열 사유로 복원한다', () => {
    const inverse = buildInverse(event, {
      parentLinkReasons: [{ parentEventId: 'P1', reason: null }],
    } as unknown as Patch)
    expect(inverse.parentLinkReasons).toEqual([
      { parentEventId: 'P1', reason: '주 상위 옛 사유' },
    ])
  })

  it('childLinkReasons: childEvents·extraChildren 양 슬롯에서 이전 값 복원(없으면 null)', () => {
    const inverse = buildInverse(event, {
      childLinkReasons: [
        { childEventId: 'C1', reason: '바뀐 사유' },
        { childEventId: 'C2', reason: '바뀐 사유2' },
        { childEventId: 'C9', reason: '신규 사유' },
      ],
    } as unknown as Patch)
    expect(inverse.childLinkReasons).toEqual([
      { childEventId: 'C1', reason: '자식 옛 사유' },
      { childEventId: 'C2', reason: '역방향 옛 사유' },
      { childEventId: 'C9', reason: null },
    ])
  })
})
