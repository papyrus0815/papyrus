import {
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react'

import { FiChevronDown, FiPlus } from 'react-icons/fi'

import { UnderlineTabButton } from '@/shared/ui/underline-tabs'

import * as S from './overview-sub-tabs.styles'

/**
 * 국가 상세 내부 서브 탭 키.
 *
 * URL/CountryDetailTab과 어휘를 통일 — 페이지(URL)와 위젯(state)이 같은 키를 공유한다.
 * 'heads-of-state'는 government 탭의 sub-view라 여기 없다.
 */
export type OverviewSubTab =
  | 'dashboard'
  | 'persons'
  | 'events'
  | 'linked-historical'
  | 'regions'
  | 'government'
  | 'military'
  | 'ethnicity'
  | 'elections'
  | 'laws'
  | 'treaty'
  | 'trade'
  | 'companies'
  | 'statistics'

interface OverviewSubTabsProps {
  activeSubTab: OverviewSubTab
  onSubTabChange: (tab: OverviewSubTab) => void
  /** 탭별 데이터 건수 — 있으면 건수 배지를 표시하고 0건인 비활성 탭은 우측 '+ 빈 탭' 메뉴로 묶는다 */
  counts?: Partial<Record<OverviewSubTab, number>>
  /** 대시보드 외의 서브탭에서 현재 국가 맥락(국기·이름·수정 버튼)을 상단에 유지하는 슬롯 */
  contextBar?: ReactNode
}

const TAB_LABELS: Array<{
  key: OverviewSubTab
  label: string
  group: number
}> = [
  // 1. 종합 개요
  { key: 'dashboard', label: '대시보드', group: 1 },
  // 2. 통치·정치·제도
  { key: 'government', label: '정부·행정', group: 2 },
  { key: 'elections', label: '정당·선거', group: 2 },
  { key: 'laws', label: '법령', group: 2 },
  // 3. 역사·인물·계보
  { key: 'events', label: '사건', group: 3 },
  { key: 'persons', label: '인물', group: 3 },
  { key: 'linked-historical', label: '과거국가', group: 3 },
  // 4. 영토·안보·외교
  { key: 'regions', label: '지리·행정구역', group: 4 },
  { key: 'military', label: '군사', group: 4 },
  { key: 'treaty', label: '조약', group: 4 },
  // 5. 경제·산업·사회
  { key: 'statistics', label: '경제·통계', group: 5 },
  { key: 'trade', label: '교역', group: 5 },
  { key: 'companies', label: '기업', group: 5 },
  { key: 'ethnicity', label: '민족', group: 5 },
]

/** 탭과 패널을 연결하는 ID 생성. 탭은 `tab-<key>`, 패널은 `panel-<key>` 규칙. */
export function tabId(key: OverviewSubTab): string {
  return `country-detail-tab-${key}`
}
export function panelId(key: OverviewSubTab): string {
  return `country-detail-panel-${key}`
}

export function OverviewSubTabs({
  activeSubTab,
  onSubTabChange,
  counts,
  contextBar,
}: OverviewSubTabsProps) {
  const listRef = useRef<HTMLDivElement | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const [emptyMenuOpen, setEmptyMenuOpen] = useState(false)

  useEffect(() => {
    if (!emptyMenuOpen) return
    const onPointerDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setEmptyMenuOpen(false)
      }
    }
    const onEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') setEmptyMenuOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onEscape)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onEscape)
    }
  }, [emptyMenuOpen])

  const { visibleTabs, emptyTabs } = useMemo(() => {
    const visible: typeof TAB_LABELS = []
    const empty: typeof TAB_LABELS = []
    for (const item of TAB_LABELS) {
      const count = counts?.[item.key]
      const shouldHideAsEmpty =
        item.key !== 'dashboard' &&
        activeSubTab !== item.key &&
        count !== undefined &&
        count === 0
      if (shouldHideAsEmpty) {
        empty.push(item)
      } else {
        visible.push(item)
      }
    }
    return { visibleTabs: visible, emptyTabs: empty }
  }, [counts, activeSubTab])

  const handleKeyDown = (keyEvent: KeyboardEvent<HTMLDivElement>) => {
    if (
      keyEvent.key !== 'ArrowLeft' &&
      keyEvent.key !== 'ArrowRight' &&
      keyEvent.key !== 'Home' &&
      keyEvent.key !== 'End'
    ) {
      return
    }
    keyEvent.preventDefault()
    const idx = visibleTabs.findIndex(
      (tabItem) => tabItem.key === activeSubTab,
    )
    if (visibleTabs.length === 0) return
    let nextIdx = idx >= 0 ? idx : 0
    if (keyEvent.key === 'ArrowLeft') {
      nextIdx = idx > 0 ? idx - 1 : visibleTabs.length - 1
    } else if (keyEvent.key === 'ArrowRight') {
      nextIdx = idx < visibleTabs.length - 1 ? idx + 1 : 0
    } else if (keyEvent.key === 'Home') {
      nextIdx = 0
    } else if (keyEvent.key === 'End') {
      nextIdx = visibleTabs.length - 1
    }
    const target = visibleTabs[nextIdx]
    if (!target) return
    onSubTabChange(target.key)
    requestAnimationFrame(() => {
      const element = listRef.current?.querySelector<HTMLButtonElement>(
        `#${CSS.escape(tabId(target.key))}`,
      )
      element?.focus()
    })
  }

  return (
    <S.StickyContainer>
      {contextBar}
      <S.Row>
        <S.Left>
          <S.TopUnderlineTabNav
            ref={listRef}
            role="tablist"
            aria-label="국가 상세 메인 메뉴"
            onKeyDown={handleKeyDown}
          >
            {visibleTabs.map(({ key, label, group }, tabIdx) => {
              const active = activeSubTab === key
              const count = counts?.[key]
              const nextTab = visibleTabs[tabIdx + 1]
              const showGroupDivider = Boolean(nextTab && nextTab.group !== group)

              return (
                <Fragment key={key}>
                  <UnderlineTabButton
                    id={tabId(key)}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    aria-controls={panelId(key)}
                    tabIndex={active ? 0 : -1}
                    $active={active}
                    onClick={() => onSubTabChange(key)}
                  >
                    <S.TabLabelWrap>
                      <span>{label}</span>
                      {count != null && count > 0 && (
                        <S.TabCountBadge $active={active}>
                          {count.toLocaleString('ko-KR')}
                        </S.TabCountBadge>
                      )}
                    </S.TabLabelWrap>
                  </UnderlineTabButton>
                  {showGroupDivider && <S.TabGroupDivider aria-hidden />}
                </Fragment>
              )
            })}
          </S.TopUnderlineTabNav>
        </S.Left>

        {emptyTabs.length > 0 && (
          <S.EmptyTabsMenuWrap ref={menuRef}>
            <S.EmptyTabsTriggerBtn
              type="button"
              $open={emptyMenuOpen}
              aria-haspopup="menu"
              aria-expanded={emptyMenuOpen}
              onClick={() => setEmptyMenuOpen((prev) => !prev)}
            >
              <FiPlus size={11.5} aria-hidden />
              <span>빈 탭 {emptyTabs.length}</span>
              <FiChevronDown size={11.5} aria-hidden />
            </S.EmptyTabsTriggerBtn>
            {emptyMenuOpen && (
              <S.EmptyTabsPopover role="menu" aria-label="미입력 도메인 탭 목록">
                <S.EmptyTabsPopoverLabel>
                  아직 기록이 없는 탭 바로 열기
                </S.EmptyTabsPopoverLabel>
                <S.EmptyTabsGrid>
                  {emptyTabs.map((emptyTab) => (
                    <S.EmptyTabOptionBtn
                      key={emptyTab.key}
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setEmptyMenuOpen(false)
                        onSubTabChange(emptyTab.key)
                      }}
                    >
                      <FiPlus size={10.5} aria-hidden />
                      {emptyTab.label}
                    </S.EmptyTabOptionBtn>
                  ))}
                </S.EmptyTabsGrid>
              </S.EmptyTabsPopover>
            )}
          </S.EmptyTabsMenuWrap>
        )}
      </S.Row>
    </S.StickyContainer>
  )
}
