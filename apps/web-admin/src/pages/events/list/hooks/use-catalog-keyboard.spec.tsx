import '@testing-library/jest-dom'

import { fireEvent, render, screen } from '@testing-library/react'

import {
  useCatalogListNavigation,
  useCatalogShortcuts,
} from './use-catalog-keyboard'

/**
 * 전역 키보드 훅 스코프 회귀 가드 (2026-07-28 검토 배치 2 / P1-3).
 *
 * 예전 구현은 window keydown에서 input/textarea/contentEditable만 제외해
 * 툴바 버튼·select·다른 뷰에서도 Enter/↑↓/Home/End를 가로챘다. 그 결과
 * 키보드로 버튼을 누를 수 없었고 페이지 스크롤도 막혔다.
 */
interface HarnessProps {
  setSelectedEventId: (id: string | null) => void
  navigate: (to: string) => void
  enabled?: boolean
  /** DOM에 실제로 렌더되는 행 — 접힌 밴드를 흉내내려면 여기서 빼면 된다 */
  renderedIds?: string[]
}

const NavHarness = ({
  setSelectedEventId,
  navigate,
  enabled = true,
  renderedIds = ['evt-1', 'evt-2', 'evt-3'],
}: HarnessProps) => {
  useCatalogListNavigation({
    setSelectedEventId,
    navigate: navigate as never,
    enabled,
  })
  return (
    <div>
      <button type="button" onClick={() => navigate('BUTTON_CLICKED')}>
        툴바 버튼
      </button>
      <select aria-label="정렬 기준">
        <option value="recent">시기순</option>
        <option value="duration">기간순</option>
      </select>
      <div role="list" aria-label="사건 목록">
        {renderedIds.map((id) => (
          <div key={id} data-event-id={id} role="listitem" tabIndex={0}>
            {id}
          </div>
        ))}
      </div>
    </div>
  )
}

describe('useCatalogListNavigation — 스코프', () => {
  it('목록 행에 포커스가 있을 때만 ↓가 선택을 옮긴다', () => {
    const setSelectedEventId = jest.fn()
    render(
      <NavHarness setSelectedEventId={setSelectedEventId} navigate={jest.fn()} />,
    )

    fireEvent.keyDown(screen.getByText('evt-1'), { key: 'ArrowDown' })
    expect(setSelectedEventId).toHaveBeenCalledWith('evt-2')
  })

  it('툴바 버튼 위에서는 ↓를 가로채지 않는다 (기본 스크롤 보존)', () => {
    const setSelectedEventId = jest.fn()
    render(
      <NavHarness setSelectedEventId={setSelectedEventId} navigate={jest.fn()} />,
    )

    const notPrevented = fireEvent.keyDown(screen.getByText('툴바 버튼'), {
      key: 'ArrowDown',
    })
    expect(setSelectedEventId).not.toHaveBeenCalled()
    // preventDefault가 호출되지 않았다 = 브라우저 기본 동작이 살아 있다
    expect(notPrevented).toBe(true)
  })

  it('네이티브 select 위에서는 ↓를 가로채지 않는다', () => {
    const setSelectedEventId = jest.fn()
    render(
      <NavHarness setSelectedEventId={setSelectedEventId} navigate={jest.fn()} />,
    )

    const notPrevented = fireEvent.keyDown(screen.getByLabelText('정렬 기준'), {
      key: 'ArrowDown',
    })
    expect(setSelectedEventId).not.toHaveBeenCalled()
    expect(notPrevented).toBe(true)
  })

  it('버튼 위 Enter를 가로채지 않는다 — 버튼 활성화가 살아 있다', () => {
    const navigate = jest.fn()
    render(<NavHarness setSelectedEventId={jest.fn()} navigate={navigate} />)

    const notPrevented = fireEvent.keyDown(screen.getByText('툴바 버튼'), {
      key: 'Enter',
    })
    expect(navigate).not.toHaveBeenCalled()
    expect(notPrevented).toBe(true)
  })

  it('맨 Enter는 상세 페이지로 이동하지 않는다 — 행 선택(드로어)은 행 자신이 담당', () => {
    const navigate = jest.fn()
    render(<NavHarness setSelectedEventId={jest.fn()} navigate={navigate} />)

    // 클릭·Space는 드로어를 여는데 Enter만 페이지를 떠나면 같은 요소의 활성화 결과가
    // 셋으로 갈린다. 화살표로 훑다 Enter를 누르면 목록·스크롤·접힘이 통째로 사라졌다.
    fireEvent.keyDown(screen.getByText('evt-3'), { key: 'Enter' })
    expect(navigate).not.toHaveBeenCalled()
  })

  it('⌘/Ctrl+Enter는 *눌린 그 행*으로 이동한다 — 상태 클로저를 읽지 않는다', () => {
    const navigate = jest.fn()
    render(<NavHarness setSelectedEventId={jest.fn()} navigate={navigate} />)

    fireEvent.keyDown(screen.getByText('evt-3'), { key: 'Enter', metaKey: true })
    expect(navigate).toHaveBeenCalledTimes(1)
    expect(navigate.mock.calls[0][0]).toContain('evt-3')

    fireEvent.keyDown(screen.getByText('evt-1'), { key: 'Enter', ctrlKey: true })
    expect(navigate).toHaveBeenCalledTimes(2)
    expect(navigate.mock.calls[1][0]).toContain('evt-1')
  })

  it('접힌 밴드에 숨은 행은 후보가 아니다 — 렌더된 행 사이로만 이동', () => {
    const setSelectedEventId = jest.fn()
    render(
      <NavHarness
        setSelectedEventId={setSelectedEventId}
        navigate={jest.fn()}
        // evt-2가 접힌 연도 밴드에 들어가 DOM에 없는 상황
        renderedIds={['evt-1', 'evt-3']}
      />,
    )

    fireEvent.keyDown(screen.getByText('evt-1'), { key: 'ArrowDown' })
    expect(setSelectedEventId).toHaveBeenCalledWith('evt-3')
  })

  it('End는 렌더된 마지막 행으로 간다', () => {
    const setSelectedEventId = jest.fn()
    render(
      <NavHarness setSelectedEventId={setSelectedEventId} navigate={jest.fn()} />,
    )

    fireEvent.keyDown(screen.getByText('evt-1'), { key: 'End' })
    expect(setSelectedEventId).toHaveBeenCalledWith('evt-3')
  })

  it('enabled=false면 행 위에서도 아무 것도 하지 않는다', () => {
    const setSelectedEventId = jest.fn()
    render(
      <NavHarness
        setSelectedEventId={setSelectedEventId}
        navigate={jest.fn()}
        enabled={false}
      />,
    )

    fireEvent.keyDown(screen.getByText('evt-1'), { key: 'ArrowDown' })
    expect(setSelectedEventId).not.toHaveBeenCalled()
  })
})

const ShortcutHarness = ({
  closeTopOverlay,
  clearSelectedEvent,
  selectedEventId = 'evt-1',
}: {
  closeTopOverlay: () => boolean
  clearSelectedEvent: () => void
  selectedEventId?: string | null
}) => {
  const searchInputRef = { current: null }
  useCatalogShortcuts({
    searchInputRef,
    setShortcutHelpOpen: jest.fn(),
    closeTopOverlay,
    selectedEventId,
    clearSelectedEvent,
  })
  return (
    <div>
      harness
      {/* 상세 패널을 흉내낸다 — 데스크톱은 region(모바일만 dialog) */}
      <div role="region" aria-label="사건 상세: 테스트">
        <button type="button" title="닫기 (Esc)" aria-label="상세 닫기">
          ✕
        </button>
      </div>
      <input aria-label="검색" />
      <select aria-label="정렬">
        <option>시기순</option>
      </select>
      <div role="dialog" aria-modal="true" aria-label="등록 모달">
        <button type="button">모달 안 버튼</button>
      </div>
    </div>
  )
}

describe('useCatalogShortcuts — Escape 우선순위', () => {
  it('열린 오버레이가 있으면 그것만 닫고 선택은 건드리지 않는다', () => {
    const closeTopOverlay = jest.fn(() => true)
    const clearSelectedEvent = jest.fn()
    render(
      <ShortcutHarness
        closeTopOverlay={closeTopOverlay}
        clearSelectedEvent={clearSelectedEvent}
      />,
    )

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(closeTopOverlay).toHaveBeenCalled()
    expect(clearSelectedEvent).not.toHaveBeenCalled()
  })

  it('닫을 오버레이가 없을 때만 선택을 해제한다', () => {
    const clearSelectedEvent = jest.fn()
    render(
      <ShortcutHarness
        closeTopOverlay={jest.fn(() => false)}
        clearSelectedEvent={clearSelectedEvent}
      />,
    )

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(clearSelectedEvent).toHaveBeenCalled()
  })

  /**
   * Escape 가드 범위 (2026-08-02 배치 3).
   *
   * 예전엔 `isInteractiveTarget`을 재사용해 **버튼까지** 막았다. 그래서 상세 패널의
   * ✕(title="닫기 (Esc)")에 포커스가 있으면 Esc가 죽었다 — 1920px 라이브 실측으로
   * 확인한 실버그다. 이제 Esc에 자기 계약이 있는 대상만 비켜준다.
   */
  describe('Escape 가드 범위', () => {
    const setup = () => {
      const clearSelectedEvent = jest.fn()
      render(
        <ShortcutHarness
          closeTopOverlay={jest.fn(() => false)}
          clearSelectedEvent={clearSelectedEvent}
        />,
      )
      return clearSelectedEvent
    }

    it('상세 패널 닫기 버튼에서 Esc가 먹는다 — 버튼은 더 이상 Esc를 삼키지 않는다', () => {
      const clearSelectedEvent = setup()
      fireEvent.keyDown(screen.getByLabelText('상세 닫기'), { key: 'Escape' })
      expect(clearSelectedEvent).toHaveBeenCalled()
    })

    it('검색 입력에서는 Esc를 비켜준다 — 검색어를 지울 때 드로어가 함께 닫히면 안 된다', () => {
      const clearSelectedEvent = setup()
      fireEvent.keyDown(screen.getByLabelText('검색'), { key: 'Escape' })
      expect(clearSelectedEvent).not.toHaveBeenCalled()
    })

    it('네이티브 select에서는 Esc를 비켜준다 — 열린 드롭다운 취소가 네이티브 계약이다', () => {
      const clearSelectedEvent = setup()
      fireEvent.keyDown(screen.getByLabelText('정렬'), { key: 'Escape' })
      expect(clearSelectedEvent).not.toHaveBeenCalled()
    })

    it('모달 안 버튼에서는 Esc를 비켜준다 — 모달만 남고 뒤 선택이 풀리면 안 된다', () => {
      // 등록 모달은 dirty 확인이 비동기라 closeTopOverlay에 일부러 빠져 있다.
      // 이 가드가 유일한 방어선이므로 버튼을 푼 뒤에도 반드시 남아 있어야 한다.
      const clearSelectedEvent = setup()
      fireEvent.keyDown(screen.getByText('모달 안 버튼'), { key: 'Escape' })
      expect(clearSelectedEvent).not.toHaveBeenCalled()
    })
  })
})
