/**
 * 인물 ↔ 사건 연결 모달.
 *
 * 인물 상세에서 '이 인물이 어떤 사건에 참여했나'를 바로 잇는다 — 예전엔 사건 상세에서만 참여
 * 인물을 넣을 수 있어, 인물 쪽에선 자유 서술 연보에 같은 내용을 한 번 더 적었다.
 *
 * 쓰기 쉽게:
 * - 열자마자 **추천**이 보인다(이 인물의 나라가 관련된, 생애 동안의 사건). 대부분 검색 없이 한 번 누르면 끝.
 * - 누르는 즉시 저장된다(따로 '저장' 없음). 연결된 사건은 위로 모이고 그 줄에서 역할을 적는다.
 *
 * mode:
 * - 'manage' — 인물 상세 '사건' 탭: 연결·해제·역할
 * - 'pick' — 연보 입력 폼 '관련 사건': 한 사건을 골라 onPick으로 돌려준다(저장은 폼이)
 */
import React, { useEffect, useMemo, useRef, useState } from 'react'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FiCheck, FiPlus, FiSearch } from 'react-icons/fi'
import styled from 'styled-components'

import { personKeys } from '@/entities/person/query-keys'
import {
  type PersonEventCandidate,
  type PersonEventCandidates,
  getPersonEventCandidates,
  linkPersonEvent,
  unlinkPersonEvent,
} from '@/shared/api/person-event-links'
import { FormInput } from '@/shared/ui/form-input/form-input'
import { Modal, ModalBody } from '@/shared/ui/modal'
import {
  KitAddButton,
  KitGroupLabel,
  kitC,
} from '@/shared/ui/register-form-kit/register-form-kit'
import { notify } from '@/shared/ui/toast'

export interface PersonEventLinkModalProps {
  isOpen: boolean
  onClose: () => void
  personId: string
  /** 머리글 보조(누구의 사건인지) */
  personName?: string
  mode?: 'manage' | 'pick'
  /** pick 모드 — 고른 사건 */
  onPick?: (candidate: PersonEventCandidate) => void
  /** pick 모드 — 지금 골라져 있는 사건(체크 표시) */
  selectedEventId?: string | null
}

const candidatesKey = (personId: string, query: string) =>
  ['person-event-candidates', personId, query] as const

/** 부호 연도 → '1853' / '기원전 31' */
export function formatCandidateYear(year: number | null | undefined): string {
  if (year == null) return '연도 미상'
  return year < 0 ? `기원전 ${-year}` : String(year)
}

export function PersonEventLinkModal({
  isOpen,
  onClose,
  personId,
  personName,
  mode = 'manage',
  onPick,
  selectedEventId,
}: PersonEventLinkModalProps) {
  const queryClient = useQueryClient()
  const searchRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 250)
    return () => window.clearTimeout(timer)
  }, [query])

  // 다시 열 때는 추천부터
  useEffect(() => {
    if (!isOpen) {
      setQuery('')
      setDebouncedQuery('')
    }
  }, [isOpen])

  const { data, isLoading, isError } = useQuery({
    queryKey: candidatesKey(personId, debouncedQuery),
    queryFn: () => getPersonEventCandidates(personId, debouncedQuery),
    enabled: isOpen && !!personId,
    staleTime: 30_000,
  })

  /** 연결 상태가 바뀌면 — 모달 목록은 즉시, 인물 상세·사건 상세는 무효화 */
  const applyLinked = (
    eventId: string,
    linked: boolean,
    role: string | null,
  ) => {
    queryClient.setQueriesData<PersonEventCandidates>(
      { queryKey: ['person-event-candidates', personId] },
      (previous) =>
        previous && {
          ...previous,
          items: previous.items.map((item) =>
            item.id === eventId ? { ...item, linked, role } : item,
          ),
        },
    )
    void queryClient.invalidateQueries({ queryKey: personKeys.detailFullAll })
    void queryClient.invalidateQueries({ queryKey: ['event-detail', eventId] })
  }

  const linkMutation = useMutation({
    mutationFn: (variables: { eventId: string; role?: string | null }) =>
      linkPersonEvent(personId, variables.eventId, { role: variables.role }),
    onSuccess: (result) => applyLinked(result.eventId, true, result.role),
    onError: (error: Error) => notify.error(`연결하지 못했습니다: ${error.message}`),
  })

  const unlinkMutation = useMutation({
    mutationFn: (eventId: string) => unlinkPersonEvent(personId, eventId),
    onSuccess: (_result, eventId) => applyLinked(eventId, false, null),
    onError: (error: Error) => notify.error(`해제하지 못했습니다: ${error.message}`),
  })

  const items = data?.items ?? []
  const { linkedItems, otherItems } = useMemo(() => {
    if (mode === 'pick' || data?.mode === 'search') {
      return { linkedItems: [], otherItems: items }
    }
    return {
      linkedItems: items.filter((item) => item.linked),
      otherItems: items.filter((item) => !item.linked),
    }
  }, [items, mode, data?.mode])

  const otherLabel =
    data?.mode === 'search'
      ? `검색 결과 ${items.length}건`
      : data?.basis
        ? `추천 — ${data.basis} 사이 이 나라의 사건`
        : '추천'

  const renderRow = (item: PersonEventCandidate) => {
    const pending =
      (linkMutation.isPending && linkMutation.variables?.eventId === item.id) ||
      (unlinkMutation.isPending && unlinkMutation.variables === item.id)
    const meta = item.countryNames.join(' · ')

    if (mode === 'pick') {
      const selected = item.id === selectedEventId
      return (
        <PickRow
          key={item.id}
          type="button"
          $selected={selected}
          aria-pressed={selected}
          onClick={() => {
            onPick?.(item)
            onClose()
          }}
        >
          <RowYear>{formatCandidateYear(item.year)}</RowYear>
          <RowText>
            <RowTitle>{item.title}</RowTitle>
            {meta && <RowMeta>{meta}</RowMeta>}
          </RowText>
          {selected && (
            <PickedMark aria-hidden="true">
              <FiCheck size={16} />
            </PickedMark>
          )}
        </PickRow>
      )
    }

    return (
      <Row key={item.id} $linked={item.linked}>
        <RowYear>{formatCandidateYear(item.year)}</RowYear>
        <RowText>
          <RowTitle>{item.title}</RowTitle>
          {meta && <RowMeta>{meta}</RowMeta>}
          {item.linked && (
            <RoleInput
              key={`${item.id}-${item.role ?? ''}`}
              defaultValue={item.role ?? ''}
              placeholder="역할 (선택) — 예: 지휘관, 조약 서명자"
              aria-label={`'${item.title}'에서의 역할`}
              maxLength={100}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  // 저장은 onBlur가 한다 — 포커스를 모달 밖(body)으로 떨구면 Esc가 안 먹으므로
                  // 검색칸으로 옮겨 모달 안에 둔다
                  searchRef.current?.focus()
                }
              }}
              onBlur={(event) => {
                const next = event.currentTarget.value.trim()
                if (next === (item.role ?? '')) return
                linkMutation.mutate({ eventId: item.id, role: next || null })
              }}
            />
          )}
        </RowText>
        <RowAction>
          {item.linked ? (
            <>
              <LinkedBadge>
                <FiCheck size={13} aria-hidden="true" />
                연결됨
              </LinkedBadge>
              <UnlinkButton
                type="button"
                disabled={pending}
                onClick={() => unlinkMutation.mutate(item.id)}
                aria-label={`'${item.title}' 연결 해제`}
              >
                해제
              </UnlinkButton>
            </>
          ) : (
            <KitAddButton
              type="button"
              disabled={pending}
              onClick={() => linkMutation.mutate({ eventId: item.id })}
              aria-label={`'${item.title}' 연결`}
            >
              <FiPlus size={15} aria-hidden="true" />
              연결
            </KitAddButton>
          )}
        </RowAction>
      </Row>
    )
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'pick' ? '관련 사건 선택' : '사건 연결'}
      subtitle={
        mode === 'pick'
          ? '이 연보 항목이 어느 사건인지 고르세요'
          : personName
            ? `${personName}이(가) 참여한 사건을 연결하세요 — 누르면 바로 저장됩니다`
            : '누르면 바로 저장됩니다'
      }
      maxWidth="min(640px, 96vw)"
      initialFocusRef={searchRef}
    >
      <ModalBody>
      <Body>
        <SearchWrap>
          <FiSearch size={15} aria-hidden="true" />
          <SearchInput
            ref={searchRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="사건 이름으로 검색"
            aria-label="사건 이름으로 검색"
          />
        </SearchWrap>

        {isLoading ? (
          <Status role="status">불러오는 중…</Status>
        ) : isError ? (
          <Status role="alert">사건 목록을 불러오지 못했습니다.</Status>
        ) : (
          <>
            {linkedItems.length > 0 && (
              <Group>
                <KitGroupLabel>연결된 사건 {linkedItems.length}</KitGroupLabel>
                <List>{linkedItems.map(renderRow)}</List>
              </Group>
            )}
            <Group>
              <KitGroupLabel>{otherLabel}</KitGroupLabel>
              {otherItems.length > 0 ? (
                <List>{otherItems.map(renderRow)}</List>
              ) : (
                <Empty>
                  {data?.mode === 'search'
                    ? `‘${debouncedQuery}’와(과) 이름이 맞는 사건이 없습니다.`
                    : '이 인물의 나라·생애에 맞는 사건이 아직 없습니다. 이름으로 검색해 보세요.'}
                </Empty>
              )}
            </Group>
          </>
        )}
      </Body>
      </ModalBody>
    </Modal>
  )
}

// ─── Styled ──────────────────────────────────────────────────────────────────

const Body = styled.div`
  display: flex;
  flex-direction: column;
  gap: 18px;
  min-height: 320px;
`

const SearchWrap = styled.div`
  position: relative;
  display: flex;
  align-items: center;

  > svg {
    position: absolute;
    left: 12px;
    color: ${({ theme }) => kitC(theme).textMuted};
    pointer-events: none;
  }
`

const SearchInput = styled(FormInput)`
  padding-left: 34px;
`

const Group = styled.section`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const List = styled.div`
  display: flex;
  flex-direction: column;
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
`

const rowGrid = `
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr) auto;
  align-items: start;
  column-gap: 12px;
  padding: 12px 4px;
`

const Row = styled.div<{ $linked: boolean }>`
  ${rowGrid}
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
`

const PickRow = styled.button<{ $selected: boolean }>`
  ${rowGrid}
  width: 100%;
  text-align: left;
  font: inherit;
  color: inherit;
  border: none;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  background: ${({ $selected }) =>
    $selected ? 'rgba(99, 102, 241, 0.08)' : 'transparent'};
  cursor: pointer;

  &:hover {
    background: rgba(99, 102, 241, 0.05);
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: -2px;
  }
`

const RowYear = styled.span`
  padding-top: 2px;
  font-size: 13px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => kitC(theme).textSecondary};
`

const RowText = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
`

const RowTitle = styled.span`
  font-size: 14px;
  font-weight: 600;
  line-height: 1.4;
  color: ${({ theme }) => theme.colors.text.primary};
  word-break: keep-all;
`

const RowMeta = styled.span`
  font-size: 12px;
  color: ${({ theme }) => kitC(theme).textMuted};
`

const RoleInput = styled(FormInput)`
  margin-top: 6px;
  padding: 7px 10px;
  font-size: 13px;
`

const RowAction = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
`

const LinkedBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.alert.success.fg};
`

const UnlinkButton = styled.button`
  padding: 6px 8px;
  font-size: 12px;
  color: ${({ theme }) => kitC(theme).textSecondary};
  background: transparent;
  border: none;
  border-radius: 6px;
  cursor: pointer;

  &:hover:not(:disabled) {
    color: ${({ theme }) => theme.colors.alert.danger.fg};
    background: rgba(239, 68, 68, 0.08);
  }
  &:disabled {
    opacity: 0.5;
    cursor: default;
  }
`

const PickedMark = styled.span`
  color: ${({ theme }) => theme.colors.primary};
  padding-top: 2px;
`

const Status = styled.p`
  margin: 24px 0;
  text-align: center;
  font-size: 13px;
  color: ${({ theme }) => kitC(theme).textMuted};
`

const Empty = styled.p`
  margin: 8px 0 0;
  font-size: 13px;
  line-height: 1.5;
  color: ${({ theme }) => kitC(theme).textMuted};
`

export default PersonEventLinkModal
