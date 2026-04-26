/**
 * 검색 + 정렬 컨트롤 바.
 */
import {
  ControlsBar,
  ResultMeta,
  SearchInput,
  SearchWrap,
  SortSelect,
} from './dynasty.styles'

export type SortKey = 'era' | 'name' | 'duration'

export const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: 'era', label: '시대순 (오래된 순)' },
  { value: 'name', label: '가나다순' },
  { value: 'duration', label: '존속기간 긴 순' },
]

interface Props {
  query: string
  onQueryChange: (q: string) => void
  sort: SortKey
  onSortChange: (s: SortKey) => void
  totalCount: number
  filteredCount: number
}

export function DynastyControls({
  query,
  onQueryChange,
  sort,
  onSortChange,
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
      </SearchWrap>
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
        {query.trim()
          ? `${filteredCount.toLocaleString()} / ${totalCount.toLocaleString()}`
          : `총 ${totalCount.toLocaleString()}`}
      </ResultMeta>
    </ControlsBar>
  )
}
