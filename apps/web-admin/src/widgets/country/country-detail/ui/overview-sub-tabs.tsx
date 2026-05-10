import { useRef, type KeyboardEvent } from 'react'

import { UnderlineTabButton } from '@/shared/ui/underline-tabs'

import * as S from './overview-sub-tabs.styles'

/**
 * 국가 상세 내부 서브 탭 키.
 *
 * URL/CountryDetailTab과 어휘를 통일 — 페이지(URL)와 위젯(state)이 같은 키를 공유한다.
 * 'heads-of-state'/'persons'/'events' 같은 페이지 전용 탭은 여기에 들어오지 않는다 (페이지에서 분기).
 */
export type OverviewSubTab =
  | 'dashboard'
  | 'linked-historical'
  | 'regions'
  | 'government'
  | 'ethnicity'
  | 'elections'
  | 'laws'
  | 'treaty'

interface OverviewSubTabsProps {
  activeSubTab: OverviewSubTab
  onSubTabChange: (tab: OverviewSubTab) => void
}

const TAB_LABELS: Array<{ key: OverviewSubTab; label: string }> = [
  { key: 'dashboard', label: '대시보드' },
  { key: 'regions', label: '행정구역' },
  { key: 'government', label: '행정조직' },
  { key: 'ethnicity', label: '민족' },
  { key: 'elections', label: '선거·투표' },
  { key: 'laws', label: '법령' },
  { key: 'linked-historical', label: '과거국가' },
  { key: 'treaty', label: '조약' },
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
}: OverviewSubTabsProps) {
  const listRef = useRef<HTMLDivElement | null>(null)

  /**
   * 화살표 키 네비게이션 — WAI-ARIA tabs 패턴.
   * Left/Right로 다음 탭, Home/End로 처음/끝 탭. 활성 변경 후 포커스 이동.
   */
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (
      e.key !== 'ArrowLeft' &&
      e.key !== 'ArrowRight' &&
      e.key !== 'Home' &&
      e.key !== 'End'
    ) {
      return
    }
    e.preventDefault()
    const idx = TAB_LABELS.findIndex((t) => t.key === activeSubTab)
    let nextIdx = idx
    if (e.key === 'ArrowLeft')
      nextIdx = idx > 0 ? idx - 1 : TAB_LABELS.length - 1
    else if (e.key === 'ArrowRight')
      nextIdx = idx < TAB_LABELS.length - 1 ? idx + 1 : 0
    else if (e.key === 'Home') nextIdx = 0
    else if (e.key === 'End') nextIdx = TAB_LABELS.length - 1
    const target = TAB_LABELS[nextIdx]
    if (!target) return
    onSubTabChange(target.key)
    // 다음 렌더에서 새 활성 탭에 포커스
    requestAnimationFrame(() => {
      const el = listRef.current?.querySelector<HTMLButtonElement>(
        `#${CSS.escape(tabId(target.key))}`,
      )
      el?.focus()
    })
  }

  return (
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
              <UnderlineTabButton
                key={key}
                id={tabId(key)}
                type="button"
                role="tab"
                aria-selected={active}
                aria-controls={panelId(key)}
                tabIndex={active ? 0 : -1}
                $active={active}
                onClick={() => onSubTabChange(key)}
              >
                {label}
              </UnderlineTabButton>
            )
          })}
        </S.TopUnderlineTabNav>
      </S.Left>
    </S.Row>
  )
}
