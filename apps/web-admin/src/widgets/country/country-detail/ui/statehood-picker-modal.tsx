/**
 * 건국·멸망 연결 모달 — 카드에서 사건·인물·나라를 골라 붙인다.
 *
 * 공용 SelectModal 대신 따로 두는 이유(2026-09-29 실측, 독일 제국 1871):
 * - 검색 전 기본 목록이 '최근 수정순'이라 378년 전투·2026년 유엔총회가 먼저 떴다.
 *   이 모달엔 **기준 해**(건국·멸망 연도)가 있으니 그 근처를 가까운 순으로 보여 준다.
 * - 연도가 '378'처럼 단위 없이 떠서 무슨 숫자인지 읽히지 않았다 → '378년 · 건국 1493년 전'.
 * - 인물·국가·사건이 한 목록에 섞여도 무엇인지 모르게 글자만 있었다 → 종류 아이콘 + 필터.
 * - 하나 고르면 닫혀서 '신라·당'처럼 여럿을 붙이려면 매번 다시 열어야 했다 → 열린 채 '추가됨'.
 */
import {
  type ReactNode,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react'

import {
  FiCalendar,
  FiCheck,
  FiEdit3,
  FiFlag,
  FiPlus,
  FiSearch,
  FiUser,
} from 'react-icons/fi'
import styled, { css } from 'styled-components'

import { formatCountryYearShort } from '@/shared/lib/country-period'
import { Modal, ModalFooter } from '@/shared/ui/modal'

export type PickerCandidateKind =
  | 'event'
  | 'person'
  | 'historicalCountry'
  | 'country'
  | 'free'

export interface PickerCandidate {
  value: string
  kind: PickerCandidateKind
  label: string
  /** 기간·생몰 등 표시용 한 줄(예: '1815–1898') */
  spanText?: string
  /** 기준 해와의 거리 계산용 부호 연도 — 없으면 거리 표기를 생략하고 뒤로 민다 */
  year?: number | null
  /** 보조 설명(예: '현재 X의 하위') */
  hint?: string
  /** 이미 붙어 있음 — 다시 고를 수 없다 */
  added?: boolean
}

export interface PickerFilter {
  key: string
  label: string
  kinds: PickerCandidateKind[]
}

interface StatehoodPickerModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  /** 머리 보조 설명(예: '독일 제국 · 건국 1871년') */
  subtitle?: ReactNode
  /** 기준 해(부호 연도) — 거리 표기와 정렬 기준 */
  anchorYear: number | null
  /** 거리 문구의 주어('건국 3년 전') */
  anchorLabel: string
  candidates: PickerCandidate[]
  /** 종류 필터 탭 — 한 종류만 다루면 생략 */
  filters?: PickerFilter[]
  query: string
  onQueryChange: (query: string) => void
  searchPlaceholder: string
  isLoading?: boolean
  isError?: boolean
  onRetry?: () => void
  onPick: (candidate: PickerCandidate) => void
  /** 검색어가 없을 때 목록 위 안내(예: '1871년 앞뒤 30년 — 가까운 순') */
  defaultHeading?: string
  /** 후보가 하나도 없을 때 문구 */
  emptyText: string
  /** 이번에 연 뒤 붙인 개수 — 푸터 요약 */
  addedThisSession?: number
}

const KIND_META: Record<
  PickerCandidateKind,
  { icon: ReactNode; label: string }
> = {
  event: { icon: <FiCalendar />, label: '사건' },
  person: { icon: <FiUser />, label: '인물' },
  historicalCountry: { icon: <FiFlag />, label: '역사 국가' },
  country: { icon: <FiFlag />, label: '현대 국가' },
  free: { icon: <FiEdit3 />, label: '직접 입력' },
}

function distanceText(
  year: number | null | undefined,
  anchor: number | null,
  subject: string,
) {
  if (year == null || anchor == null) return null
  // 서기 1년 바로 앞이 기원전 1년이다(0년 없음)
  const crossesEra = (year < 0 && anchor > 0) || (year > 0 && anchor < 0)
  const raw = year - anchor
  const gap = Math.abs(raw) - (crossesEra ? 1 : 0)
  if (gap === 0) return `${subject}한 해`
  return `${subject} ${gap.toLocaleString('ko-KR')}년 ${raw < 0 ? '전' : '뒤'}`
}

export function StatehoodPickerModal({
  isOpen,
  onClose,
  title,
  subtitle,
  anchorYear,
  anchorLabel,
  candidates,
  filters,
  query,
  onQueryChange,
  searchPlaceholder,
  isLoading,
  isError,
  onRetry,
  onPick,
  defaultHeading,
  emptyText,
  addedThisSession = 0,
}: StatehoodPickerModalProps) {
  const listId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const [filterKey, setFilterKey] = useState<string>(filters?.[0]?.key ?? 'all')
  const [activeIndex, setActiveIndex] = useState(0)

  // 다시 열 때마다 첫 필터로
  useEffect(() => {
    if (isOpen) setFilterKey(filters?.[0]?.key ?? 'all')
    // filters는 호출부 리터럴이라 매 렌더 새 배열 — 열림 전환에만 반응한다
  }, [isOpen])

  const activeFilter = filters?.find((filter) => filter.key === filterKey)
  const visible = useMemo(() => {
    const kinds = activeFilter?.kinds
    const filtered = kinds
      ? candidates.filter(
          (candidate) =>
            candidate.kind === 'free' || kinds.includes(candidate.kind),
        )
      : candidates
    return filtered
  }, [candidates, activeFilter])

  const countByFilter = useMemo(() => {
    const counts = new Map<string, number>()
    for (const filter of filters ?? []) {
      counts.set(
        filter.key,
        candidates.filter((candidate) => filter.kinds.includes(candidate.kind))
          .length,
      )
    }
    return counts
  }, [candidates, filters])

  // 목록이 바뀌면 활성 행을 첫 '고를 수 있는' 행으로
  useEffect(() => {
    const first = visible.findIndex((candidate) => !candidate.added)
    setActiveIndex(first === -1 ? 0 : first)
  }, [visible])

  useEffect(() => {
    const row = listRef.current?.querySelector<HTMLElement>(
      `[data-index="${activeIndex}"]`,
    )
    row?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  const moveActive = (step: 1 | -1) => {
    if (visible.length === 0) return
    let next = activeIndex
    for (let guard = 0; guard < visible.length; guard += 1) {
      next = (next + step + visible.length) % visible.length
      if (!visible[next].added) break
    }
    setActiveIndex(next)
  }

  const pick = (candidate: PickerCandidate | undefined) => {
    if (!candidate || candidate.added) return
    onPick(candidate)
    inputRef.current?.focus()
  }

  const activeOptionId =
    visible[activeIndex] != null ? `${listId}-option-${activeIndex}` : undefined

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      maxWidth="600px"
      maxHeight="min(720px, 86vh)"
      initialFocusRef={inputRef}
    >
      <Head>
        <SearchField>
          <FiSearch aria-hidden />
          <SearchInput
            ref={inputRef}
            type="search"
            role="combobox"
            aria-expanded
            aria-controls={listId}
            aria-activedescendant={activeOptionId}
            aria-autocomplete="list"
            value={query}
            placeholder={searchPlaceholder}
            onChange={(changeEvent) => onQueryChange(changeEvent.target.value)}
            onKeyDown={(keyEvent) => {
              if (keyEvent.key === 'ArrowDown') {
                keyEvent.preventDefault()
                moveActive(1)
              } else if (keyEvent.key === 'ArrowUp') {
                keyEvent.preventDefault()
                moveActive(-1)
              } else if (keyEvent.key === 'Enter') {
                keyEvent.preventDefault()
                pick(visible[activeIndex])
              }
            }}
          />
        </SearchField>
        {filters && filters.length > 1 && (
          <FilterRow role="tablist" aria-label="종류">
            {filters.map((filter) => {
              const selected = filter.key === filterKey
              const count = countByFilter.get(filter.key) ?? 0
              return (
                <FilterTab
                  key={filter.key}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  $selected={selected}
                  onClick={() => {
                    setFilterKey(filter.key)
                    inputRef.current?.focus()
                  }}
                >
                  {filter.label}
                  <FilterCount>{count}</FilterCount>
                </FilterTab>
              )
            })}
          </FilterRow>
        )}
      </Head>

      <Body>
        {!query.trim() && defaultHeading && visible.length > 0 && (
          <ListHeading>{defaultHeading}</ListHeading>
        )}
        {isError ? (
          <StateNote role="status">
            후보를 불러오지 못했습니다.
            {onRetry && (
              <InlineAction type="button" onClick={onRetry}>
                다시 시도
              </InlineAction>
            )}
          </StateNote>
        ) : isLoading && visible.length === 0 ? (
          <SkeletonList aria-hidden>
            {Array.from({ length: 6 }, (_, index) => (
              <SkeletonRow key={index} />
            ))}
          </SkeletonList>
        ) : visible.length === 0 ? (
          <StateNote role="status">{emptyText}</StateNote>
        ) : (
          <List id={listId} role="listbox" aria-label={title} ref={listRef}>
            {visible.map((candidate, index) => {
              const meta = KIND_META[candidate.kind]
              const yearText =
                candidate.spanText ??
                formatCountryYearShort(candidate.year ?? null)
              const distance =
                candidate.kind === 'free'
                  ? null
                  : distanceText(candidate.year, anchorYear, anchorLabel)
              const isActive = index === activeIndex
              return (
                <Row
                  key={candidate.value}
                  id={`${listId}-option-${index}`}
                  data-index={index}
                  role="option"
                  aria-selected={isActive}
                  aria-disabled={candidate.added || undefined}
                  $active={isActive}
                  $added={!!candidate.added}
                  onMouseEnter={() => !candidate.added && setActiveIndex(index)}
                  onMouseDown={(mouseEvent) => mouseEvent.preventDefault()}
                  onClick={() => pick(candidate)}
                >
                  <KindIcon
                    $kind={candidate.kind}
                    title={meta.label}
                    aria-hidden
                  >
                    {meta.icon}
                  </KindIcon>
                  <RowText>
                    <RowTitle>{candidate.label}</RowTitle>
                    <RowMeta>
                      {filters &&
                        filters.length > 1 &&
                        candidate.kind !== 'free' && <span>{meta.label}</span>}
                      {yearText && <span>{yearText}</span>}
                      {distance && <Distance>{distance}</Distance>}
                      {candidate.hint && <span>{candidate.hint}</span>}
                    </RowMeta>
                  </RowText>
                  <RowAction aria-hidden $added={!!candidate.added}>
                    {candidate.added ? (
                      <>
                        <FiCheck /> 추가됨
                      </>
                    ) : (
                      <FiPlus />
                    )}
                  </RowAction>
                </Row>
              )
            })}
          </List>
        )}
      </Body>

      <ModalFooter>
        <FooterNote>
          {addedThisSession > 0
            ? `${addedThisSession}개 추가함`
            : '↑↓로 고르고 Enter로 추가 — 여럿을 이어서 붙일 수 있습니다'}
        </FooterNote>
        <DoneButton type="button" onClick={onClose}>
          완료
        </DoneButton>
      </ModalFooter>
    </Modal>
  )
}

// ─── Styled ─────────────────────────────────────────────────────────────────

/** 검색·필터는 스크롤 밖 — 목록을 내려도 입력이 사라지지 않는다 */
const Head = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px 24px 12px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  flex-shrink: 0;
`

const SearchField = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  height: 40px;
  padding: 0 12px;
  border: 1px solid ${({ theme }) => theme.colors.border.medium};
  border-radius: 10px;
  background: ${({ theme }) => theme.colors.background.secondary};
  color: ${({ theme }) => theme.colors.text.tertiary};
  transition:
    border-color 0.14s,
    box-shadow 0.14s;

  &:focus-within {
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.activeLight};
  }

  svg {
    flex-shrink: 0;
    width: 15px;
    height: 15px;
  }
`

const SearchInput = styled.input`
  flex: 1;
  min-width: 0;
  height: 100%;
  border: none;
  outline: none;
  background: transparent;
  font: inherit;
  font-size: 13.5px;
  color: ${({ theme }) => theme.colors.text.primary};

  /* 테두리·링은 감싼 SearchField가 그린다 — 전역 input 포커스 스타일이 안쪽에 한 겹 더 긋지 않게 */
  &:focus,
  &:focus-visible {
    outline: none;
    border: none;
    box-shadow: none;
  }

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
  &::-webkit-search-cancel-button {
    cursor: pointer;
  }
`

const FilterRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`

const FilterTab = styled.button<{ $selected: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 28px;
  padding: 0 10px;
  border: 1px solid
    ${({ theme, $selected }) =>
      $selected ? theme.colors.primary : theme.colors.border.light};
  border-radius: 999px;
  background: ${({ theme, $selected }) =>
    $selected ? theme.colors.activeLight : 'transparent'};
  font-size: 12.5px;
  font-weight: 600;
  color: ${({ theme, $selected }) =>
    $selected ? theme.colors.primary : theme.colors.text.secondary};
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
`

const FilterCount = styled.span`
  font-size: 11.5px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  opacity: 0.75;
`

const Body = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 8px 12px 12px;
`

const ListHeading = styled.div`
  padding: 8px 12px 6px;
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const List = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 2px;
`

const Row = styled.li<{ $active: boolean; $added: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 48px;
  padding: 6px 12px;
  border-radius: 10px;
  cursor: ${({ $added }) => ($added ? 'default' : 'pointer')};
  background: ${({ theme, $active, $added }) =>
    $active && !$added ? theme.colors.activeLight : 'transparent'};
  opacity: ${({ $added }) => ($added ? 0.6 : 1)};
`

const KindIcon = styled.span<{ $kind: PickerCandidateKind }>`
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.background.secondary};
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  color: ${({ theme }) => theme.colors.text.secondary};
  ${({ $kind, theme }) =>
    $kind === 'free' &&
    css`
      border-style: dashed;
      color: ${theme.colors.text.tertiary};
    `}

  svg {
    width: 14px;
    height: 14px;
  }
`

const RowText = styled.span`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
`

const RowTitle = styled.span`
  font-size: 13.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const RowMeta = styled.span`
  display: flex;
  flex-wrap: wrap;
  gap: 0 8px;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};

  > span + span::before {
    content: '·';
    margin-right: 8px;
  }
`

const Distance = styled.span`
  color: ${({ theme }) => theme.colors.text.secondary};
  font-weight: 600;
`

const RowAction = styled.span<{ $added: boolean }>`
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme, $added }) =>
    $added ? theme.colors.text.tertiary : theme.colors.primary};

  svg {
    width: 14px;
    height: 14px;
  }
`

const StateNote = styled.p`
  margin: 0;
  padding: 28px 12px;
  text-align: center;
  font-size: 13px;
  line-height: 1.6;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const InlineAction = styled.button`
  margin-left: 8px;
  padding: 0;
  border: none;
  background: none;
  font: inherit;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.primary};
  cursor: pointer;
`

const SkeletonList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 6px 0;
`

const SkeletonRow = styled.div`
  height: 44px;
  border-radius: 10px;
  background: ${({ theme }) => theme.colors.background.secondary};
`

const FooterNote = styled.span`
  margin-right: auto;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const DoneButton = styled.button`
  height: 34px;
  padding: 0 16px;
  border: none;
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.primary};
  font-size: 13px;
  font-weight: 700;
  color: #fff;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
`
