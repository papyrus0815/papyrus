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

export function OverviewSubTabs({
  activeSubTab,
  onSubTabChange,
}: OverviewSubTabsProps) {
  return (
    <S.Row>
      <S.Left>
        <S.TopUnderlineTabNav role="tablist" aria-label="국가 상세 메인 메뉴">
          {TAB_LABELS.map(({ key, label }) => (
            <UnderlineTabButton
              key={key}
              type="button"
              role="tab"
              aria-selected={activeSubTab === key}
              $active={activeSubTab === key}
              onClick={() => onSubTabChange(key)}
            >
              {label}
            </UnderlineTabButton>
          ))}
        </S.TopUnderlineTabNav>
      </S.Left>
    </S.Row>
  )
}
