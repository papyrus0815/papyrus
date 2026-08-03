/**
 * 카탈로그 키보드 상호작용
 *
 * - 페이지 단축키: ? → 도움말, / → 검색 포커스, Esc → 최상위 레이어 하나만 닫기
 * - 리스트 네비게이션: ↑/↓/Home/End → 이전/다음 선택, Enter → 상세 이동
 *
 * ## 스코프 원칙 (2026-07-28 검토 배치 2)
 *
 * 이 훅들은 `window`에 keydown을 건다. 예전에는 제외 대상이 input/textarea/
 * contentEditable뿐이어서, "리스트 네비게이션"이라는 *지역* 기능이 페이지 전체의
 * 키 입력을 가로챘다:
 *  - 사건이 하나라도 선택돼 있으면 Enter가 preventDefault돼 **어떤 버튼도 키보드로
 *    누를 수 없었고**, 대신 상세로 이탈했다(게다가 클로저가 stale이라 *직전에 보던*
 *    사건으로 갔다).
 *  - `<select>`(정렬·페이지 크기·세기)에 포커스가 있어도 ↑↓를 가로채 값이 안 바뀌었다.
 *  - 목록에 항목이 하나라도 있으면 ↑↓·Home·End의 **기본 스크롤이 페이지 전역에서
 *    사라졌다**.
 *
 * 지금 규칙:
 *  1. 리스트 네비게이션은 **포커스가 실제 목록 행(`[data-event-id]`) 안에 있을 때만**
 *     동작한다. 그 밖에서는 브라우저 기본 동작(스크롤·select 조작)을 건드리지 않는다.
 *  2. 목록 뷰가 아니거나 오버레이가 열려 있으면 훅 자체가 등록되지 않는다(`enabled`).
 *  3. Enter는 **눌린 그 행**의 id로 이동한다 — 상태 클로저를 읽지 않아 stale이 없다.
 *  4. 선택이 바뀌면 그 행으로 포커스를 옮긴다(스크롤은 페이지의 단일 지점이 담당).
 */
import { useEffect } from 'react'
import type { RefObject } from 'react'
import type { useNavigate } from 'react-router-dom'

import { pathKeys } from '@/shared/router'

/** 목록 행 하나를 식별하는 속성 — 행 렌더러(event-list-item)와 공유하는 계약 */
const ROW_SELECTOR = '[data-event-id]'

/**
 * 이 요소에 포커스가 있을 때는 키를 가로채면 안 된다.
 * 자기 키 계약을 가진 것들: 텍스트 입력, 네이티브 select, 버튼/링크,
 * 그리고 팝오버·메뉴·다이얼로그처럼 자체 내비게이션을 갖는 컨테이너.
 */
const isInteractiveTarget = (target: EventTarget | null): boolean => {
  const element = target as HTMLElement | null
  if (!element) return false
  if (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement
  ) {
    return true
  }
  if (element.isContentEditable) return true
  return Boolean(
    element.closest?.(
      'button, a, select, [role="button"], [role="listbox"], [role="menu"], [role="dialog"], [role="option"], [contenteditable="true"]',
    ),
  )
}

/**
 * **텍스트 입력** 요소인가 — `?`·`/` 전용 가드.
 *
 * `isInteractiveTarget`은 버튼·링크·다이얼로그까지 막는다. 그 넓은 가드를 `?`에 쓰면
 * 도움말 모달이 열린 순간(포커스 트랩이 첫 focusable인 닫기 **버튼**으로 포커스를 옮긴다)
 * `?`가 삼켜져 **모달 안에서는 같은 키로 닫을 수 없다** — 정작 모달 본문은 '이 도움말
 * 열기/닫기'라고 안내한다. 포털 수정으로 모달이 실제로 렌더되면서 드러난 어긋남이다.
 * 글자 입력을 가로채면 안 되는 것은 텍스트 입력 요소뿐이므로 그것만 막는다.
 */
const isTextEntryTarget = (target: EventTarget | null): boolean => {
  const element = target as HTMLElement | null
  if (!element) return false
  if (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement
  ) {
    return true
  }
  return Boolean(element.isContentEditable)
}

/**
 * Esc를 삼켜야 하는 대상인가 — **Escape 전용** 가드.
 *
 * 예전에는 `isInteractiveTarget`을 재사용했는데, 그건 `button, a, [role="button"]`까지
 * `closest`로 막는다. 그래서 상세 패널 안 **아무 버튼에 포커스가 있으면 Esc가 죽었다** —
 * 하필 그 버튼 중 하나가 `title="닫기 (Esc)"`인 ✕였다(1920px 실측: ✕에 포커스 → Esc →
 * 패널 그대로, 목록 행에 포커스 → Esc → 정상 닫힘). 데스크톱 패널은 `role="region"`이라
 * 자체 Esc 핸들러도 없어(그건 모바일 dialog 분기 전용) 이 훅이 유일한 경로였다.
 *
 * 그렇다고 텍스트 입력만 막으면 반대편 회귀가 열린다. 그래서 **Esc에 자기 계약이 있는
 * 것만** 막는다:
 *  - 텍스트 입력 — 브라우저가 입력값을 지우는 네이티브 동작. 검색어를 다듬을 때마다
 *    보던 사건의 드로어가 함께 닫히면 안 된다.
 *  - 네이티브 select — 열린 드롭다운을 Esc로 취소하는 계약(실측으로 확인).
 *  - dialog·menu·listbox 컨테이너 — 자기 Esc를 스스로 처리한다. 여기를 통과시키면
 *    "모달은 남고 뒤의 상세 선택만 조용히 풀리는" 과거 결함이 되살아난다. 특히 사건 등록
 *    모달은 dirty 확인이 비동기라 `closeTopOverlay`에 **일부러 빠져 있어**(use-catalog-modals
 *    주석) 이 가드가 유일한 방어선이다.
 *
 * 빠진 것은 `button, a, [role="button"], [role="option"]` — 버그를 만들던 바로 그 집합이다.
 */
const isEscapeReservedTarget = (target: EventTarget | null): boolean => {
  const element = target as HTMLElement | null
  if (!element) return false
  if (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement
  ) {
    return true
  }
  if (element.isContentEditable) return true
  return Boolean(
    element.closest?.(
      '[role="dialog"], [role="menu"], [role="listbox"], [contenteditable="true"]',
    ),
  )
}

/**
 * 모달 다이얼로그가 열려 있는가 — `/` 전용 가드.
 *
 * `isTextEntryTarget`은 input/textarea/contenteditable만 막는다. 그래서 폼 모달이 열려
 * 있고 포커스가 날짜·국가처럼 **버튼**에 있으면 `/`가 통과해, 모달 뒤 카탈로그 검색창으로
 * 포커스를 옮겨 버렸다. `aria-modal` 다이얼로그 밖으로 포커스가 탈출하는 것이라
 * `?`가 삼켜지는 것보다 심각하다.
 *
 * 포커스가 body에 있어도(모달 열림 직후 등) 막아야 하므로 대상이 아니라 **문서 전체**를
 * 본다.
 */
const isModalDialogOpen = (): boolean => {
  if (typeof document === 'undefined') return false
  return Boolean(document.querySelector('[role="dialog"][aria-modal="true"]'))
}

interface CatalogShortcutsArgs {
  searchInputRef: RefObject<HTMLInputElement | null>
  setShortcutHelpOpen: (updater: (value: boolean) => boolean) => void
  /** 가장 위 오버레이 하나만 닫고 닫았는지 반환 — Escape 우선순위의 단일 출처 */
  closeTopOverlay: () => boolean
  selectedEventId: string | null
  clearSelectedEvent: () => void
}

/** ? · / · Esc 단축키 */
export function useCatalogShortcuts(args: CatalogShortcutsArgs) {
  const {
    searchInputRef,
    setShortcutHelpOpen,
    closeTopOverlay,
    selectedEventId,
    clearSelectedEvent,
  } = args

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const escapeReserved = isEscapeReservedTarget(event.target)
      const inTextEntry = isTextEntryTarget(event.target)
      if (event.key === '?' && !inTextEntry) {
        event.preventDefault()
        setShortcutHelpOpen((open) => !open)
      } else if (event.key === '/' && !inTextEntry && !isModalDialogOpen()) {
        event.preventDefault()
        searchInputRef.current?.focus()
      } else if (event.key === 'Escape') {
        // 열린 레이어가 있으면 그것 *하나만* 닫는다. 예전에는 도움말만 특별 취급하고
        // 그 외에는 무조건 선택을 해제해, 요약 모달을 띄운 채 Esc를 누르면 모달은
        // 남고 뒤의 상세 선택이 조용히 풀렸다.
        if (closeTopOverlay()) return
        // Esc에 자기 계약이 있는 대상만 비켜준다 — 상세 패널의 ✕·이전/다음 같은
        // **버튼은 더 이상 막지 않는다**(isEscapeReservedTarget 주석 참고).
        if (escapeReserved) return
        if (selectedEventId) clearSelectedEvent()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [
    selectedEventId,
    searchInputRef,
    setShortcutHelpOpen,
    closeTopOverlay,
    clearSelectedEvent,
  ])
}

interface CatalogListNavigationArgs {
  setSelectedEventId: (id: string | null) => void
  navigate: ReturnType<typeof useNavigate>
  /** 목록 뷰이고 오버레이가 닫혀 있을 때만 true — false면 리스너를 아예 안 건다 */
  enabled: boolean
}

/**
 * ↑ ↓ Home End Enter — 리스트 네비게이션 (포커스가 목록 행 안에 있을 때만)
 *
 * 이동 대상은 **실제로 렌더된 행**(같은 `role="list"` 안의 `[data-event-id]`)에서
 * 뽑는다. 평탄화 모델 배열을 쓰면 접힌 세기·연도 밴드에 숨은 항목까지 후보가 되어,
 * 화살표가 화면에 없는 사건을 선택하고 포커스는 아무 데도 가지 않는다.
 */
export function useCatalogListNavigation(args: CatalogListNavigationArgs) {
  const { setSelectedEventId, navigate, enabled } = args

  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (event: KeyboardEvent) => {
      // 포커스가 목록 행 안에 있을 때만 반응한다. 이 게이트 하나가 툴바 버튼·
      // select·드로어·타임라인에서의 오작동과 페이지 스크롤 차단을 함께 없앤다.
      const focusedRow = (event.target as HTMLElement | null)?.closest?.(
        ROW_SELECTOR,
      ) as HTMLElement | null
      if (!focusedRow) return
      if (isInteractiveTarget(event.target)) return

      /**
       * 상세 **페이지로 이동**은 수식키를 요구한다(Ctrl/⌘+Enter).
       *
       * 이전엔 맨 Enter가 이동이었다. 그런데 같은 행에서 클릭과 Space는 드로어를 열고
       * Enter만 페이지를 떠나, 같은 요소의 활성화 결과가 셋으로 갈렸다(실측 확인:
       * click/Space → `?event=` 추가, Enter → `/events/{id}/`). 화살표로 목록을 훑다가
       * Enter를 누르면 목록·스크롤·접힘 상태를 통째로 잃는다.
       * 이제 Enter/Space는 둘 다 '선택(드로어)'이고(행 자체 onKeyDown이 담당),
       * 여기서는 수식키가 있을 때만 이동한다 — 링크의 관례(⌘+클릭)와도 맞는다.
       */
      if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
        // 눌린 *그 행*으로 이동 — 상태 클로저를 읽지 않으므로 stale이 없다.
        const rowId = focusedRow.dataset.eventId
        if (!rowId) return
        event.preventDefault()
        navigate(pathKeys.events.detail(rowId))
        return
      }

      const listRoot = focusedRow.closest('[role="list"]') ?? document
      const rows = Array.from(
        listRoot.querySelectorAll<HTMLElement>(ROW_SELECTOR),
      )
      if (rows.length === 0) return

      const currentIndex = rows.indexOf(focusedRow)
      let newIndex = currentIndex

      if (event.key === 'ArrowDown') {
        event.preventDefault()
        newIndex = Math.min(currentIndex + 1, rows.length - 1)
      } else if (event.key === 'ArrowUp') {
        event.preventDefault()
        newIndex = Math.max(currentIndex - 1, 0)
      } else if (event.key === 'Home') {
        event.preventDefault()
        newIndex = 0
      } else if (event.key === 'End') {
        event.preventDefault()
        newIndex = rows.length - 1
      } else {
        return
      }

      if (newIndex === currentIndex) return
      const nextRow = rows[newIndex]
      const nextId = nextRow?.dataset.eventId
      if (!nextId) return

      setSelectedEventId(nextId)
      // 포커스를 새 행으로 옮긴다 — 다음 화살표 입력이 같은 게이트를 통과하고,
      // 스크린리더도 선택 이동을 따라온다. 스크롤은 여기서 하지 않는다:
      // 선택 변경 시 스크롤은 events.page의 단일 effect가 담당한다(중복 방지).
      nextRow.focus({ preventScroll: true })
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [enabled, navigate, setSelectedEventId])
}
