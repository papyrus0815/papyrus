import { useMemo, useState } from 'react'

import { keepPreviousData, useQuery } from '@tanstack/react-query'
import styled from 'styled-components'

import { eventKeys } from '@/shared/api/event-query-keys'
import { getEventLinkCandidates } from '@/shared/api/events'
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value'
import { formatYearLabel, parseIsoDateParts } from '@/shared/lib/iso-date'
import { SelectModal, type SelectOption } from '@/shared/ui/select-modal/select-modal'

/**
 * 선거 폼의 '연결 사건' — 예전엔 사건 UUID를 손으로 붙여 넣는 입력칸이라 선거 4건 중 0건이 연결돼 있었다.
 * 사건 검색 모달로 고른다. 검색어가 없으면 투표 연도 앞뒤 5년 사건을 가까운 순으로 보인다.
 */
interface LinkedEventPickerFieldProps {
  /** 연결된 사건 id — 비면 연결 없음 */
  value: string
  /** 처음 연결돼 있던 사건 제목(수정 모달) */
  initialTitle?: string | null
  /** 투표 연도 — 후보를 그 근처부터 */
  nearYear?: number | null
  onChange: (eventId: string) => void
  inputId?: string
}

const NEAR_WINDOW = 5

export function LinkedEventPickerField({
  value,
  initialTitle,
  nearYear,
  onChange,
  inputId,
}: LinkedEventPickerFieldProps) {
  const [open, setOpen] = useState(false)
  const [pickedTitle, setPickedTitle] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const debouncedTerm = useDebouncedValue(searchTerm, 250, String(open))
  const browsing = debouncedTerm.trim() === ''
  const near = browsing && nearYear != null ? nearYear : null

  const candidatesQuery = useQuery({
    queryKey: eventKeys.linkCandidates(debouncedTerm, 'election', near),
    queryFn: () =>
      getEventLinkCandidates({
        query: debouncedTerm,
        limit: 51,
        ...(near != null ? { near, window: NEAR_WINDOW } : {}),
      }),
    enabled: open,
    staleTime: 60_000,
    placeholderData: keepPreviousData,
    retry: 1,
  })

  const options = useMemo<SelectOption[]>(
    () =>
      (candidatesQuery.data ?? []).slice(0, 50).map((candidate) => {
        const parts = parseIsoDateParts(candidate.startDate)
        const year =
          parts?.year ??
          (candidate.startYear != null ? (candidate.startEra === 'BC' ? -candidate.startYear : candidate.startYear) : null)
        const date = candidate.startDate ? candidate.startDate.slice(0, 10) : year != null ? formatYearLabel(year) : null
        return {
          value: candidate.id,
          label: candidate.title,
          description: [date, candidate.parentEventTitle ? `‘${candidate.parentEventTitle}’의 하위` : null]
            .filter(Boolean)
            .join(' · ') || undefined,
        }
      }),
    [candidatesQuery.data],
  )

  const shownTitle = value ? (pickedTitle ?? initialTitle ?? '연결된 사건') : null

  return (
    <Row>
      {shownTitle ? <LinkedTitle title={shownTitle}>{shownTitle}</LinkedTitle> : <Empty>연결 없음</Empty>}
      <Action id={inputId} type="button" onClick={() => setOpen(true)}>
        {value ? '바꾸기' : '사건 고르기'}
      </Action>
      {value && (
        <Action
          type="button"
          onClick={() => {
            setPickedTitle(null)
            onChange('')
          }}
        >
          연결 해제
        </Action>
      )}
      <SelectModal
        isOpen={open}
        onClose={() => {
          setOpen(false)
          setSearchTerm('')
        }}
        title="연결할 사건"
        options={options}
        selectedValue={value || undefined}
        onSelect={(picked) => {
          const candidate = candidatesQuery.data?.find((item) => item.id === picked)
          setPickedTitle(candidate?.title ?? null)
          onChange(picked)
          setOpen(false)
          setSearchTerm('')
        }}
        searchable
        searchPlaceholder={nearYear != null ? `사건명으로 검색 — 비우면 ${nearYear}년 앞뒤 ${NEAR_WINDOW}년` : '사건명으로 검색'}
        isLoading={candidatesQuery.isLoading}
        isSearching={candidatesQuery.isFetching || searchTerm !== debouncedTerm}
        hasError={candidatesQuery.isError}
        onRetry={() => void candidatesQuery.refetch()}
        onQueryChange={setSearchTerm}
      />
    </Row>
  )
}

const Row = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 12px;
  min-height: 36px;
`

const LinkedTitle = styled.span`
  min-width: 0;
  overflow: hidden;
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  text-overflow: ellipsis;
  white-space: nowrap;
`

const Empty = styled.span`
  font-size: 13.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const Action = styled.button`
  min-height: 28px;
  padding: 0 10px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 8px;
  background: transparent;
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    border-color: ${({ theme }) => theme.colors.border.medium};
  }
`
