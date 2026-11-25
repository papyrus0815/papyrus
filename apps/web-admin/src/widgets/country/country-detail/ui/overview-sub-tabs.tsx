import {
  useRef,
  type KeyboardEvent,
  type ReactNode,
} from 'react'

import { UnderlineTabButton } from '@/shared/ui/underline-tabs'

import { CountryTabSubmenu } from './country-tab-submenu'
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
  contextBar,
}: OverviewSubTabsProps) {
  const listRef = useRef<HTMLDivElement | null>(null)

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
    const idx = TAB_LABELS.findIndex(
      (tabItem) => tabItem.key === activeSubTab,
    )
    if (TAB_LABELS.length === 0) return
    let nextIdx = idx >= 0 ? idx : 0
    if (keyEvent.key === 'ArrowLeft') {
      nextIdx = idx > 0 ? idx - 1 : TAB_LABELS.length - 1
    } else if (keyEvent.key === 'ArrowRight') {
      nextIdx = idx < TAB_LABELS.length - 1 ? idx + 1 : 0
    } else if (keyEvent.key === 'Home') {
      nextIdx = 0
    } else if (keyEvent.key === 'End') {
      nextIdx = TAB_LABELS.length - 1
    }
    const target = TAB_LABELS[nextIdx]
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
            {TAB_LABELS.map(({ key, label }) => {
              const active = activeSubTab === key

              return (
                /* 2차 구역이 있는 탭(정부·행정·군사)은 hover·클릭으로 아래 메뉴가 펼쳐진다 — 없으면 단추 그대로 */
                <CountryTabSubmenu key={key} tabKey={key} active={active}>
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
                    <span>{label}</span>
                  </UnderlineTabButton>
                </CountryTabSubmenu>
              )
            })}
          </S.TopUnderlineTabNav>
        </S.Left>
      </S.Row>
    </S.StickyContainer>
  )
}
