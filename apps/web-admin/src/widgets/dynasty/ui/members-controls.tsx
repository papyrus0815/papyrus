/**
 * 가문 구성원 — 검색·정렬·뷰 토글 컨트롤.
 */
import {
  ControlsBar,
  Counter,
  SearchInput,
  SearchWrap,
  SortSelect,
  ViewToggleBtn,
  ViewToggleGroup,
} from './members.styles'

export type MemberSort = 'birth' | 'name' | 'age' | 'influence'
export type MemberView = 'timeline' | 'grid'

const SORT_OPTIONS: Array<{ value: MemberSort; label: string }> = [
  { value: 'birth', label: '출생순 (오래된 순)' },
  { value: 'name', label: '가나다순' },
  { value: 'age', label: '수명 긴 순' },
  { value: 'influence', label: '영향력 높은 순' },
]

interface Props {
  query: string
  onQueryChange: (q: string) => void
  sort: MemberSort
  onSortChange: (s: MemberSort) => void
  view: MemberView
  onViewChange: (v: MemberView) => void
  total: number
  filtered: number
}

const IconTimeline = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <line x1="3" y1="12" x2="21" y2="12" />
    <circle cx="7" cy="12" r="2" />
    <circle cx="13" cy="12" r="2" />
    <circle cx="19" cy="12" r="2" />
  </svg>
)
const IconGrid = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
)

export function MembersControls({
  query,
  onQueryChange,
  sort,
  onSortChange,
  view,
  onViewChange,
  total,
  filtered,
}: Props) {
  return (
    <ControlsBar>
      <SearchWrap>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.3-4.3" />
        </svg>
        <SearchInput
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="이름·재위명 검색"
          aria-label="구성원 검색"
        />
      </SearchWrap>
      <SortSelect
        value={sort}
        onChange={(e) => onSortChange(e.target.value as MemberSort)}
        aria-label="정렬"
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </SortSelect>
      <Counter>
        {query.trim()
          ? `${filtered.toLocaleString()} / ${total.toLocaleString()}`
          : `총 ${total.toLocaleString()}`}
      </Counter>
      <ViewToggleGroup role="tablist" aria-label="뷰 전환">
        <ViewToggleBtn
          type="button"
          role="tab"
          aria-pressed={view === 'timeline'}
          $active={view === 'timeline'}
          onClick={() => onViewChange('timeline')}
        >
          <IconTimeline />
          타임라인
        </ViewToggleBtn>
        <ViewToggleBtn
          type="button"
          role="tab"
          aria-pressed={view === 'grid'}
          $active={view === 'grid'}
          onClick={() => onViewChange('grid')}
        >
          <IconGrid />
          그리드
        </ViewToggleBtn>
      </ViewToggleGroup>
    </ControlsBar>
  )
}
