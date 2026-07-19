/**
 * 공용 사건 선택 모달 — 최근 200건을 로드해 제목 부분일치로 클라 필터.
 * 행 클릭 시 {id, title}을 onSelect로 넘긴다(모달 닫기는 소비처 책임).
 * 포털 렌더라 소비처의 CSS 변수가 상속되지 않음 — 테마 토큰만 사용.
 * (person-detail-panel tenure-achievements의 업적 연결 피커를 일반화해 추출)
 */
import { useEffect, useMemo, useState } from 'react'

import { useQuery } from '@tanstack/react-query'
import { FiSearch } from 'react-icons/fi'
import styled from 'styled-components'

import { getAllEvents } from '@/shared/api/events'
import { Modal } from '@/shared/ui/modal'

/** 피커에서 선택된 사건 (id + 표시용 제목) */
export interface EventPickerSelection {
  id: string
  title: string
}

interface EventPickerModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (picked: EventPickerSelection) => void
  /** 모달 헤더 제목 */
  title?: string
}

const EventPickerSearchRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  color: ${({ theme }) => theme.colors.text.tertiary};

  input {
    flex: 1;
    min-width: 0;
    border: none;
    background: transparent;
    font-size: 14px;
    color: ${({ theme }) => theme.colors.text.primary};
    outline: none;
    &::placeholder {
      color: ${({ theme }) => theme.colors.text.tertiary};
    }
  }
`

const EventPickerList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px;
  max-height: min(56vh, 400px);
  overflow-y: auto;
`

const EventPickerRow = styled.button`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  width: 100%;
  padding: 9px 12px;
  border: none;
  border-radius: 10px;
  background: transparent;
  text-align: left;
  cursor: pointer;
  transition: background 0.12s;
  &:hover {
    background: ${({ theme }) => theme.colors.hover};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: -2px;
  }
`

const EventPickerRowTitle = styled.span`
  font-size: 13.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  word-break: break-word;
`

const EventPickerRowMeta = styled.span`
  font-size: 11.5px;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const EventPickerEmpty = styled.p`
  margin: 0;
  padding: 28px 16px;
  text-align: center;
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

// ─── 소비처 트리거 행 공용 스타일 — 미선택=점선 [사건 연결] 버튼, 선택=제목 칩+해제 X ───

export const EventPickerLinkBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: transparent;
  border: 1px dashed
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.18)' : 'rgba(15,23,42,0.18)'};
  border-radius: 999px;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s, background 0.15s;
  &:hover {
    color: ${({ theme }) => theme.colors.primary};
    border-color: ${({ theme }) => theme.colors.primary};
    border-style: solid;
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
`

export const EventPickerLinkedChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: 100%;
  padding: 6px 8px 6px 14px;
  font-size: 13px;
  font-weight: 600;
  border-radius: 999px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(99,106,242,0.16)' : 'rgba(99,102,241,0.1)'};
  color: ${({ theme }) => theme.colors.primary};
  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`

export const EventPickerLinkClearBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: inherit;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.15s;
  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.08)'};
  }
  &:focus-visible {
    outline: 2px solid currentColor;
    outline-offset: 1px;
  }
`

export function EventPickerModal({
  isOpen,
  onClose,
  onSelect,
  title = '사건 연결',
}: EventPickerModalProps) {
  const [search, setSearch] = useState('')

  const { data, isLoading, isError } = useQuery({
    queryKey: ['events', 'event-link-picker'],
    queryFn: () => getAllEvents({ limit: 200 }),
    staleTime: 5 * 60 * 1000,
    enabled: isOpen,
  })

  // 재오픈 시 이전 검색어가 남지 않게 닫힐 때 초기화
  useEffect(() => {
    if (!isOpen) setSearch('')
  }, [isOpen])

  const filtered = useMemo(() => {
    const rows = data ?? []
    const keyword = search.trim().toLowerCase()
    if (!keyword) return rows
    return rows.filter((eventRow) =>
      (eventRow.title ?? '').toLowerCase().includes(keyword),
    )
  }, [data, search])

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="narrow">
      <EventPickerSearchRow>
        <FiSearch size={14} />
        <input
          type="search"
          value={search}
          onChange={(changeEvent) => setSearch(changeEvent.target.value)}
          placeholder="사건 제목 검색"
          aria-label="사건 제목 검색"
        />
      </EventPickerSearchRow>
      <EventPickerList>
        {isLoading ? (
          <EventPickerEmpty>불러오는 중…</EventPickerEmpty>
        ) : isError ? (
          <EventPickerEmpty>사건 목록을 불러오지 못했습니다.</EventPickerEmpty>
        ) : filtered.length === 0 ? (
          <EventPickerEmpty>
            {search.trim() ? '검색 결과가 없습니다.' : '등록된 사건이 없습니다.'}
          </EventPickerEmpty>
        ) : (
          filtered.map((eventRow) => (
            <EventPickerRow
              key={eventRow.id}
              type="button"
              onClick={() =>
                onSelect({
                  id: eventRow.id,
                  title: eventRow.title ?? '연결된 사건',
                })
              }
            >
              <EventPickerRowTitle>{eventRow.title}</EventPickerRowTitle>
              {eventRow.startDate && (
                <EventPickerRowMeta>
                  {String(eventRow.startDate).slice(0, 10)}
                </EventPickerRowMeta>
              )}
            </EventPickerRow>
          ))
        )}
      </EventPickerList>
    </Modal>
  )
}
