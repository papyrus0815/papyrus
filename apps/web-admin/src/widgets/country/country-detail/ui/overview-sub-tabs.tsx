import { Fragment, useRef, type KeyboardEvent, type ReactNode } from 'react'

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
  /** 탭별 데이터 건수 — 있으면 건수 배지를 표시하고 0건인 비활성 탭은 대비를 낮춘다 */
  counts?: Partial<Record<OverviewSubTab, number>>
  /** 대시보드 외의 서브탭에서 현재 국가 맥락(국기·이름·수정 버튼)을 상단에 유지하는 슬롯 */
  contextBar?: ReactNode
}

const TAB_LABELS: Array<{
  key: OverviewSubTab
  label: string
  groupEnd?: boolean
}> = [
  { key: 'dashboard', label: '대시보드', groupEnd: true },
  { key: 'persons', label: '인물' },
  { key: 'events', label: '사건' },
  { key: 'linked-historical', label: '과거국가', groupEnd: true },
  { key: 'government', label: '행정조직' },
  { key: 'regions', label: '행정구역' },
  { key: 'elections', label: '선거·투표' },
  { key: 'laws', label: '법령', groupEnd: true },
  { key: 'treaty', label: '조약' },
  { key: 'ethnicity', label: '민족', groupEnd: true },
  { key: 'statistics', label: '경제·통계' },
  { key: 'trade', label: '교역' },
  { key: 'companies', label: '기업' },
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

  /**
   * 화살표 키 네비게이션 — WAI-ARIA tabs 패턴.
   * Left/Right로 다음 탭, Home/End로 처음/끝 탭. 활성 변경 후 포커스 이동.
   */
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
    const idx = TAB_LABELS.findIndex((tabItem) => tabItem.key === activeSubTab)
    let nextIdx = idx
    if (keyEvent.key === 'ArrowLeft')
      nextIdx = idx > 0 ? idx - 1 : TAB_LABELS.length - 1
    else if (keyEvent.key === 'ArrowRight')
      nextIdx = idx < TAB_LABELS.length - 1 ? idx + 1 : 0
    else if (keyEvent.key === 'Home') nextIdx = 0
    else if (keyEvent.key === 'End') nextIdx = TAB_LABELS.length - 1
    const target = TAB_LABELS[nextIdx]
    if (!target) return
    onSubTabChange(target.key)
    // 다음 렌더에서 새 활성 탭에 포커스
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
            {TAB_LABELS.map(({ key, label, groupEnd }) => {
              const active = activeSubTab === key
              const count = counts?.[key]
              const isEmptyTab =
                key !== 'dashboard' && !active && count !== undefined && count === 0

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
                    <S.TabLabelWrap $empty={isEmptyTab}>
                      <span>{label}</span>
                      {count != null && count > 0 && (
                        <S.TabCountBadge $active={active}>
                          {count.toLocaleString('ko-KR')}
                        </S.TabCountBadge>
                      )}
                    </S.TabLabelWrap>
                  </UnderlineTabButton>
                  {groupEnd && <S.TabGroupDivider aria-hidden />}
                </Fragment>
              )
            })}
          </S.TopUnderlineTabNav>
        </S.Left>
      </S.Row>
    </S.StickyContainer>
  )
}
