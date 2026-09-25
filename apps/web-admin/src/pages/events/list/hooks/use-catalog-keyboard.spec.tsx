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
  toggleEventExpansion?: (eventId: string) => void
  /**
   * 행별 계층 메타 — ←/→ 트리 키가 읽는 data 속성의 원본.
   * 실제 행 렌더러(event-list-item)가 싣는 것과 같은 계약이다.
   */
  rowMeta?: Record<
    string,
    { parentId?: string; canExpand?: boolean; expanded?: boolean }
  >
  /**
   * DOM에 실제로 렌더되는 행을 **연도 그룹 단위**로 준다 — 접힌 밴드를 흉내내려면
   * 그룹째 빼면 된다.
   *
   * ⚠️ 평평한 단일 `role="list"`로 두지 말 것. 실제 목록은 `role="list"`가 **연도마다
   * 하나씩** 있고 그 전부를 스크롤 컨테이너(`[data-list-scroller]`)가 감싼다. 하네스가
   * 평평하면 "그룹 마지막 행에서 ↓가 무동작"이라는 실제 결함을 구조적으로 재현할 수 없다.
   */
  renderedGroups?: string[][]
  /** 접힌 밴드 인덱스 — 머리글의 aria-expanded를 뒤집어 ←/→ 계약을 재현한다 */
  collapsedBands?: number[]
  onToggleBand?: (groupIndex: number) => void
}

const NavHarness = ({
  setSelectedEventId,
  navigate,
  enabled = true,
  toggleEventExpansion = jest.fn(),
  rowMeta = {},
  renderedGroups = [
    ['evt-1', 'evt-2'],
    ['evt-3', 'evt-4'],
  ],
  collapsedBands = [],
  onToggleBand,
}: HarnessProps) => {
  useCatalogListNavigation({
    setSelectedEventId,
    navigate: navigate as never,
    enabled,
    toggleEventExpansion,
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
      <div data-list-scroller="">
        {renderedGroups.map((groupIds, groupIndex) => (
          <div
            key={groupIds[0] ?? groupIndex}
            role="list"
            aria-label={`연도 그룹 ${groupIndex + 1}`}
          >
            {/* 연도 밴드 머리글 — 실제 목록처럼 그룹 **앞**에 서고 탭 정지점이 아니다.
                ↑↓ 순회에 편입돼 있으므로 하네스에도 같은 계약으로 둔다. */}
            <button
              type="button"
              tabIndex={-1}
              data-band-toggle="year"
              aria-expanded={
                collapsedBands.includes(groupIndex) ? 'false' : 'true'
              }
              onClick={() => onToggleBand?.(groupIndex)}
            >
              {`밴드 ${groupIndex + 1}`}
            </button>
            {groupIds.map((eventId) => {
              const meta = rowMeta[eventId] ?? {}
              return (
                <div
                  key={eventId}
                  data-event-id={eventId}
                  data-parent-id={meta.parentId}
                  data-can-expand={meta.canExpand ? 'true' : undefined}
                  data-expanded={
                    meta.canExpand ? (meta.expanded ? 'true' : 'false') : undefined
                  }
                  role="listitem"
                  tabIndex={0}
                >
                  {eventId}
                  {/* 행 *안의* 액션 — 로빙 규약상 여기서도 ↑↓는 행을 옮겨야 한다. */}
                  <button type="button">{`${eventId} 셰브론`}</button>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

describe('useCatalogListNavigation — 밴드 머리글', () => {
  /**
   * 머리글은 원래 각자 탭 정지점이었다. 실측에서 목록 안 정지점 64개 중 **62개**가
   * 머리글이라, 목록을 지나 다음 컨트롤로 가는 데 Tab을 62번 눌러야 했다. 정지점을
   * 내리는 대신 화살표 순회에 편입했으므로, 그 순회가 곧 도달성의 유일한 보증이다.
   */
  it('↓가 행과 밴드 머리글을 DOM 순서대로 함께 지난다', () => {
    const setSelectedEventId = jest.fn()
    render(
      <NavHarness setSelectedEventId={setSelectedEventId} navigate={jest.fn()} />,
    )

    // 그룹 1의 마지막 행에서 ↓ → 다음 그룹의 **머리글**로 간다(행을 건너뛰지 않는다)
    fireEvent.keyDown(screen.getByText('evt-2'), { key: 'ArrowDown' })
    expect(screen.getByText('밴드 2')).toHaveFocus()
    // 머리글은 사건이 아니므로 선택을 바꾸지 않는다 — 드로어가 엉뚱한 사건으로 갈리지 않게.
    expect(setSelectedEventId).not.toHaveBeenCalled()

    fireEvent.keyDown(screen.getByText('밴드 2'), { key: 'ArrowDown' })
    expect(setSelectedEventId).toHaveBeenCalledWith('evt-3')
  })

  it('머리글 위의 →/←는 그 구간을 펼치고 접는다', () => {
    const onToggleBand = jest.fn()
    render(
      <NavHarness
        setSelectedEventId={jest.fn()}
        navigate={jest.fn()}
        collapsedBands={[0]}
        onToggleBand={onToggleBand}
      />,
    )

    // 접혀 있으면 →가 펼친다
    fireEvent.keyDown(screen.getByText('밴드 1'), { key: 'ArrowRight' })
    expect(onToggleBand).toHaveBeenCalledWith(0)

    // 이미 접혀 있는데 ←를 누르면 아무 일도 하지 않는다(가로 스크롤을 뺏지 않는다)
    onToggleBand.mockClear()
    fireEvent.keyDown(screen.getByText('밴드 1'), { key: 'ArrowLeft' })
    expect(onToggleBand).not.toHaveBeenCalled()

    // 펼쳐진 머리글에서는 ←가 접는다
    fireEvent.keyDown(screen.getByText('밴드 2'), { key: 'ArrowLeft' })
    expect(onToggleBand).toHaveBeenCalledWith(1)
  })
})

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
        renderedGroups={[['evt-1'], ['evt-3']]}
      />,
    )

    // 사이에 낀 것은 다음 밴드의 **머리글**이지 숨은 행이 아니다 — 접힌 evt-2는
    // DOM에 없으므로 후보에서 통째로 빠진다(이 테스트의 본래 계약).
    fireEvent.keyDown(screen.getByText('evt-1'), { key: 'ArrowDown' })
    expect(screen.getByText('밴드 2')).toHaveFocus()
    fireEvent.keyDown(screen.getByText('밴드 2'), { key: 'ArrowDown' })
    expect(setSelectedEventId).toHaveBeenCalledWith('evt-3')
  })

  /**
   * 회귀 가드 — 이동 스코프는 **스크롤 컨테이너**지 연도 그룹이 아니다.
   *
   * `closest('[role="list"]')`로 스코프를 잡던 시절, `role="list"`는 연도마다 하나씩
   * 있으므로 그룹의 마지막 행에서 ↓가 무동작이었다. 1행짜리 연도 그룹에서는 ↑↓가
   * 아예 아무 일도 하지 않았다.
   */
  /**
   * ⚠️ 그룹 경계에는 **밴드 머리글이 한 칸 낀다**(2026-09-24). 머리글이 탭 정지점에서
   * 내려오며 ↑↓ 순회에 편입됐기 때문이다 — 파일 탐색기·에디터의 그룹 목록과 같은
   * 관습이고, 머리글에 내려선 자리에서 바로 그 구간을 접을 수 있다.
   * 그룹을 건너뛰는 이동 자체는 그대로다(스코프는 여전히 스크롤 컨테이너).
   */
  it('연도 그룹의 마지막 행에서 ↓는 다음 그룹 머리글을 거쳐 첫 행으로 간다', () => {
    const setSelectedEventId = jest.fn()
    render(
      <NavHarness setSelectedEventId={setSelectedEventId} navigate={jest.fn()} />,
    )

    // evt-2 = 첫 그룹의 마지막 행 → 다음 그룹의 머리글
    fireEvent.keyDown(screen.getByText('evt-2'), { key: 'ArrowDown' })
    expect(screen.getByText('밴드 2')).toHaveFocus()
    expect(setSelectedEventId).not.toHaveBeenCalled()

    // 한 칸 더 → 다음 그룹의 첫 행
    fireEvent.keyDown(screen.getByText('밴드 2'), { key: 'ArrowDown' })
    expect(setSelectedEventId).toHaveBeenCalledWith('evt-3')
  })

  it('다음 그룹의 첫 행에서 ↑는 머리글을 거쳐 이전 그룹의 마지막 행으로 돌아간다', () => {
    const setSelectedEventId = jest.fn()
    render(
      <NavHarness setSelectedEventId={setSelectedEventId} navigate={jest.fn()} />,
    )

    fireEvent.keyDown(screen.getByText('evt-3'), { key: 'ArrowUp' })
    expect(screen.getByText('밴드 2')).toHaveFocus()

    fireEvent.keyDown(screen.getByText('밴드 2'), { key: 'ArrowUp' })
    expect(setSelectedEventId).toHaveBeenCalledWith('evt-2')
  })

  it('End는 목록 전체의 마지막 행으로 간다 — 그룹 마지막이 아니다', () => {
    const setSelectedEventId = jest.fn()
    render(
      <NavHarness setSelectedEventId={setSelectedEventId} navigate={jest.fn()} />,
    )

    fireEvent.keyDown(screen.getByText('evt-1'), { key: 'End' })
    expect(setSelectedEventId).toHaveBeenCalledWith('evt-4')
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

/**
 * ←/→ 트리 키 (2026-08-11 하위 사건 검토 배치 4 / CTRL-5·A11Y-3).
 *
 * 목록은 계층을 그리면서도 계층을 **조작하는** 키 계약이 없었다 — 화살표는 상하 이동뿐이라
 * 부모 하나를 여닫는 데 Tab→Enter→Shift+Tab→↓ 네 키가 필요했고, 셰브론에 포커스가 가면
 * ↑↓가 통째로 죽어 브라우저 기본 스크롤만 일어났다.
 */
describe('useCatalogListNavigation — ←/→ 트리 키', () => {
  const TREE_META = {
    'evt-1': { canExpand: true, expanded: false },
    'evt-2': { parentId: 'evt-1', canExpand: false },
    'evt-3': { canExpand: true, expanded: true },
    'evt-4': { parentId: 'evt-3', canExpand: false },
  }

  it('접힌 부모에서 →는 펼친다', () => {
    const toggleEventExpansion = jest.fn()
    render(
      <NavHarness
        setSelectedEventId={jest.fn()}
        navigate={jest.fn()}
        toggleEventExpansion={toggleEventExpansion}
        rowMeta={TREE_META}
      />,
    )

    fireEvent.keyDown(screen.getByText('evt-1'), { key: 'ArrowRight' })
    expect(toggleEventExpansion).toHaveBeenCalledWith('evt-1')
  })

  it('펼쳐진 부모에서 →는 첫 자식으로 내려간다', () => {
    const setSelectedEventId = jest.fn()
    const toggleEventExpansion = jest.fn()
    render(
      <NavHarness
        setSelectedEventId={setSelectedEventId}
        navigate={jest.fn()}
        toggleEventExpansion={toggleEventExpansion}
        rowMeta={TREE_META}
      />,
    )

    fireEvent.keyDown(screen.getByText('evt-3'), { key: 'ArrowRight' })
    expect(toggleEventExpansion).not.toHaveBeenCalled()
    expect(setSelectedEventId).toHaveBeenCalledWith('evt-4')
  })

  it('펼쳐진 부모에서 ←는 접는다', () => {
    const toggleEventExpansion = jest.fn()
    render(
      <NavHarness
        setSelectedEventId={jest.fn()}
        navigate={jest.fn()}
        toggleEventExpansion={toggleEventExpansion}
        rowMeta={TREE_META}
      />,
    )

    fireEvent.keyDown(screen.getByText('evt-3'), { key: 'ArrowLeft' })
    expect(toggleEventExpansion).toHaveBeenCalledWith('evt-3')
  })

  it('자식 행에서 ←는 부모 행으로 올라간다', () => {
    const setSelectedEventId = jest.fn()
    render(
      <NavHarness
        setSelectedEventId={setSelectedEventId}
        navigate={jest.fn()}
        rowMeta={TREE_META}
      />,
    )

    fireEvent.keyDown(screen.getByText('evt-4'), { key: 'ArrowLeft' })
    expect(setSelectedEventId).toHaveBeenCalledWith('evt-3')
  })

  it('자식 없는 최상위 행에서는 →가 기본 동작을 뺏지 않는다', () => {
    const setSelectedEventId = jest.fn()
    const notPrevented = (() => {
      render(
        <NavHarness
          setSelectedEventId={setSelectedEventId}
          navigate={jest.fn()}
          renderedGroups={[['solo']]}
        />,
      )
      return fireEvent.keyDown(screen.getByText('solo'), { key: 'ArrowRight' })
    })()
    expect(setSelectedEventId).not.toHaveBeenCalled()
    expect(notPrevented).toBe(true)
  })

  it('행 안의 액션에 포커스가 있어도 ↑↓는 행을 옮긴다', () => {
    const setSelectedEventId = jest.fn()
    render(
      <NavHarness setSelectedEventId={setSelectedEventId} navigate={jest.fn()} />,
    )

    fireEvent.keyDown(screen.getByText('evt-1 셰브론'), { key: 'ArrowDown' })
    expect(setSelectedEventId).toHaveBeenCalledWith('evt-2')
  })
})
