/**
 * 검색 + 정렬 + 진행 중 필터 컨트롤 바.
 */
import {
  ControlsBar,
  ResultMeta,
  SearchClearBtn,
  SearchInput,
  SearchWrap,
  SegmentedBtn,
  SegmentedGroup,
  SortSelect,
} from './dynasty.styles'

export type SortKey = 'era' | 'name' | 'duration'
export type StatusFilter = 'all' | 'ongoing' | 'ended'

export const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: 'era', label: '시대순 (오래된 순)' },
  { value: 'name', label: '가나다순' },
  { value: 'duration', label: '존속기간 긴 순' },
]

const STATUS_OPTIONS: Array<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: '전체' },
  { value: 'ongoing', label: '진행 중' },
  { value: 'ended', label: '종료' },
]

interface Props {
  query: string
  onQueryChange: (q: string) => void
  sort: SortKey
  onSortChange: (s: SortKey) => void
  status: StatusFilter
  onStatusChange: (s: StatusFilter) => void
  totalCount: number
  filteredCount: number
}

export function DynastyControls({
  query,
  onQueryChange,
  sort,
  onSortChange,
  status,
  onStatusChange,
  totalCount,
  filteredCount,
}: Props) {
  return (
    <ControlsBar>
      <SearchWrap>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.3-4.3" />
        </svg>
        <SearchInput
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="가문명·본관·시조·가훈 검색"
          aria-label="가문 검색"
        />
        {query && (
          <SearchClearBtn
            type="button"
            aria-label="검색어 지우기"
            onClick={() => onQueryChange('')}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </SearchClearBtn>
        )}
      </SearchWrap>
      <SegmentedGroup role="group" aria-label="진행 상태 필터">
        {STATUS_OPTIONS.map((o) => (
          <SegmentedBtn
            key={o.value}
            type="button"
            aria-pressed={status === o.value}
            $active={status === o.value}
            onClick={() => onStatusChange(o.value)}
          >
            {o.label}
          </SegmentedBtn>
        ))}
      </SegmentedGroup>
      <SortSelect
        value={sort}
        onChange={(e) => onSortChange(e.target.value as SortKey)}
        aria-label="정렬"
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </SortSelect>
      <ResultMeta>
        {query.trim() || status !== 'all'
          ? `${filteredCount.toLocaleString()} / ${totalCount.toLocaleString()}`
          : `총 ${totalCount.toLocaleString()}`}
      </ResultMeta>
    </ControlsBar>
  )
}
