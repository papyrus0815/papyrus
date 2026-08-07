/**
 * `useAnchoredPosition` 회귀 가드 (2026-08-02 검토 `INT-15/PERF-8`, 배치 8).
 *
 * 이 훅은 스크롤을 **캡처 단계**로 구독한다 — 본문·툴바 등 조상 스크롤러가 움직일 때마다
 * 콜백이 온다는 뜻이다. 예전엔 그때마다 좌표가 같아도 새 객체를 setState해서, 트리거가
 * 고정된 sticky 툴바인데도 팝오버(옵션 수십 개)가 스크롤 내내 다시 그려졌다.
 * 여기서 고정하는 계약은 둘이다: ⑴ 좌표가 같으면 **같은 객체**를 유지한다
 * ⑵ 좌표가 실제로 변하면 반영한다.
 */
import { act, renderHook } from '@testing-library/react'

import { useAnchoredPosition } from './use-anchored-position.hook'

/** 현재 렌더에서 트리거가 보고할 사각형 — 테스트가 중간에 바꾼다 */
let anchorRect = { top: 100, bottom: 130, left: 40, width: 200 }

const anchorRef = {
  current: {
    getBoundingClientRect: () => anchorRect as unknown as DOMRect,
  } as unknown as HTMLElement,
}

/** rAF 코얼레스가 한 프레임 뒤에 도는 구조라, 이벤트 후 프레임을 넘겨 준다 */
const dispatchScrollAndSettle = async () => {
  await act(async () => {
    window.dispatchEvent(new Event('scroll'))
    await new Promise((resolve) => setTimeout(resolve, 48))
  })
}

beforeEach(() => {
  anchorRect = { top: 100, bottom: 130, left: 40, width: 200 }
})

describe('useAnchoredPosition', () => {
  it('열리면 첫 렌더에서 동기적으로 좌표를 계산한다', () => {
    const { result } = renderHook(() => useAnchoredPosition(anchorRef, true))
    // gap 기본 4 → bottom(130) + 4
    expect(result.current?.top).toBe(134)
    expect(result.current?.left).toBe(40)
    expect(result.current?.minWidth).toBe(200)
  })

  it('닫혀 있으면 좌표가 없다', () => {
    const { result } = renderHook(() => useAnchoredPosition(anchorRef, false))
    expect(result.current).toBeNull()
  })

  it('좌표가 그대로인 스크롤은 같은 객체를 유지한다(검토 INT-15/PERF-8)', async () => {
    const { result } = renderHook(() => useAnchoredPosition(anchorRef, true))
    const first = result.current

    await dispatchScrollAndSettle()
    await dispatchScrollAndSettle()

    expect(result.current).toBe(first)
  })

  it('트리거가 실제로 움직이면 새 좌표를 반영한다', async () => {
    const { result } = renderHook(() => useAnchoredPosition(anchorRef, true))
    const first = result.current

    anchorRect = { top: 60, bottom: 90, left: 40, width: 200 }
    await dispatchScrollAndSettle()

    expect(result.current).not.toBe(first)
    expect(result.current?.top).toBe(94)
  })
})
