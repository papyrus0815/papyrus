/**
 * 묶음 전개의 **재구성 도구** — 하위 사건을 개별↔묶음으로 바꾸고, 여러 개를 골라 새 묶음으로 묶거나
 * 이미 있는 묶음 밑으로 옮기고, 묶음 하위는 그 자리에서 펼쳐 그 아래에 또 더한다.
 *
 * 예전엔 하위 하나를 묶음으로 바꾸려면 그 상세로 들어가 종류를 바꾸고, 그 밑에 넣을 사건마다 다시
 * 상세로 들어가 상위를 고쳐야 했다(1차세계대전 하위 18건 중 7월 위기 11건을 한 묶음으로 → 상세 왕복 12번).
 */
import { useState } from 'react'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { FiChevronDown, FiChevronRight, FiCornerLeftUp, FiPlus } from 'react-icons/fi'
import { Link } from 'react-router-dom'
import styled from 'styled-components'

import {
  RADIUS,
  ledgerAccent,
  ledgerAccentSubtle,
  ledgerBackground,
  ledgerHairlineStrong,
} from '@/entities/event/ui/ledger-tokens'
import { metaText } from '@/pages/events/styles/theme'
import { formatDateRange } from '@/pages/events/utils/events.utils'
import { type CreateEventDto, type UpdateEventDto, createEvent, updateEvent } from '@/shared/api/events'
import { invalidateEventQueries } from '@/shared/api/invalidate-events'
import { pathKeys } from '@/shared/router'
import { notify } from '@/shared/ui/toast'

import { eventDetailQueryOptions } from '../use-event-detail'
import { type DatedLike, spanOfChildren } from './collection-development.lib'
import { crossPatchErrorMessage } from './detail-network.lib'

/* ───────────────────────── 개별 ↔ 묶음 ───────────────────────── */

/**
 * 종류 바꾸기 — '개별 | 묶음' 두 칸. 서버 규칙을 그대로 따른다:
 *  - 개별 → 묶음: 전개 단락이 있으면 거부(단락은 하위 사건이 맡아야 한다 → 그 사건의 '하위 사건으로 나누기')
 *  - 묶음 → 개별: 하위가 남아 있으면 거부
 * 거부 사유는 서버 문장 그대로 알린다(같은 규칙을 여기서 또 계산하지 않는다).
 */
export function KindSwitch({
  parentId,
  child,
}: {
  parentId: string
  child: { id: string; title: string; isCollection: boolean }
}) {
  const queryClient = useQueryClient()
  const [busy, setBusy] = useState(false)

  const change = async (toCollection: boolean) => {
    if (busy || toCollection === child.isCollection) return
    setBusy(true)
    try {
      await updateEvent(child.id, { kind: toCollection ? 'COLLECTION' : 'SINGLE' } as UpdateEventDto)
      invalidateEventQueries(queryClient, { eventId: parentId })
      invalidateEventQueries(queryClient, { eventId: child.id })
      notify.success(`'${child.title}'을(를) ${toCollection ? '묶음' : '개별 사건'}으로 바꿨습니다`)
    } catch (error) {
      const message = crossPatchErrorMessage(error)
      notify.error(
        toCollection
          ? `묶음으로 바꾸지 못했습니다 — ${message}`
          : `개별 사건으로 바꾸지 못했습니다 — ${message}`,
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <Segment role="radiogroup" aria-label={`${child.title} 종류`} aria-busy={busy}>
      <SegmentOption
        type="button"
        role="radio"
        aria-checked={!child.isCollection}
        $active={!child.isCollection}
        disabled={busy}
        onClick={() => void change(false)}
      >
        개별
      </SegmentOption>
      <SegmentOption
        type="button"
        role="radio"
        aria-checked={child.isCollection}
        $active={child.isCollection}
        disabled={busy}
        onClick={() => void change(true)}
      >
        묶음
      </SegmentOption>
    </Segment>
  )
}

/* ───────────────────────── 묶음 하위 펼치기 ───────────────────────── */

/**
 * 묶음 하위의 하위 — 펼칠 때만 그 사건 상세를 받아 온다(상위 응답엔 손자가 없다).
 * 끝에 '이 묶음에 하위 추가' — 그 묶음 상세로 들어가지 않고 여기서 바로 더한다.
 */
export function NestedChildren({
  parentId,
  collectionId,
  collectionTitle,
  onAddUnder,
}: {
  /** 이 묶음의 상위(지금 보고 있는 사건) — '위로 꺼내기'의 행선지 */
  parentId: string
  collectionId: string
  collectionTitle: string
  onAddUnder: () => void
}) {
  const queryClient = useQueryClient()
  const { data, isLoading, isError } = useQuery(eventDetailQueryOptions(collectionId))
  const [busy, setBusy] = useState(false)

  /**
   * 모두 위로 꺼내기 — 묶은 것을 되돌리는 길. 이 묶음 밑의 하위를 지금 사건 바로 밑으로 올린다.
   * 빈 묶음은 남는다(지우기는 파괴라 여기서 하지 않는다 — 비면 '개별'로 바꾸거나 그 상세에서 지운다).
   */
  const liftAll = async (ids: string[]) => {
    if (busy || ids.length === 0) return
    setBusy(true)
    let moved = 0
    try {
      for (const id of ids) {
        await updateEvent(id, { parentEventId: parentId } as UpdateEventDto)
        moved += 1
        invalidateEventQueries(queryClient, { eventId: id })
      }
      notify.success(`'${collectionTitle}' 밑의 ${moved}건을 위로 꺼냈습니다`)
    } catch (error) {
      notify.error(`${moved}건 꺼낸 뒤 멈췄습니다 — ${crossPatchErrorMessage(error)}`)
    } finally {
      invalidateEventQueries(queryClient, { eventId: parentId })
      invalidateEventQueries(queryClient, { eventId: collectionId })
      setBusy(false)
    }
  }
  const nested = [...(data?.childEvents ?? [])].sort((first, second) =>
    String(first.startDate ?? '').localeCompare(String(second.startDate ?? '')),
  )

  return (
    <Nested>
      {isLoading && <NestedNote>불러오는 중…</NestedNote>}
      {isError && <NestedNote>하위 사건을 불러오지 못했습니다.</NestedNote>}
      {!isLoading && !isError && nested.length === 0 && <NestedNote>아직 이 묶음 밑에 하위 사건이 없습니다.</NestedNote>}
      {nested.length > 0 && (
        <NestedList>
          {nested.map((grandchild) => (
            <li key={grandchild.id}>
              <NestedTitle to={pathKeys.events.detail(grandchild.id)}>{grandchild.title}</NestedTitle>
              {grandchild.startDate && (
                <NestedDate>
                  {formatDateRange(
                    grandchild.startDate,
                    grandchild.endDate ?? undefined,
                    grandchild.startDatePrecision,
                    grandchild.endDatePrecision,
                  )}
                </NestedDate>
              )}
              {grandchild.kind === 'COLLECTION' && <NestedKind>묶음</NestedKind>}
            </li>
          ))}
        </NestedList>
      )}
      <NestedActions>
        <NestedAdd type="button" onClick={onAddUnder} disabled={busy}>
          <FiPlus aria-hidden />이 묶음에 하위 추가
        </NestedAdd>
        {nested.length > 0 && (
          <NestedLift
            type="button"
            disabled={busy}
            onClick={() => void liftAll(nested.map((grandchild) => grandchild.id))}
          >
            <FiCornerLeftUp aria-hidden />
            {busy ? '꺼내는 중…' : `모두 위로 꺼내기 (${nested.length})`}
          </NestedLift>
        )}
      </NestedActions>
    </Nested>
  )
}

/** 묶음 하위 행의 펼침 단추 — '하위 보기' 글자 + 갈매기 */
export function ExpandToggle({
  expanded,
  onToggle,
  title,
}: {
  expanded: boolean
  onToggle: () => void
  title: string
}) {
  return (
    <ExpandButton type="button" aria-expanded={expanded} aria-label={`${title} 하위 사건 ${expanded ? '접기' : '펼치기'}`} onClick={onToggle}>
      {expanded ? <FiChevronDown aria-hidden /> : <FiChevronRight aria-hidden />}
      하위
    </ExpandButton>
  )
}

/* ───────────────────────── 골라서 묶기 ───────────────────────── */

export interface RegroupCandidate extends DatedLike {
  id: string
  title: string
  isCollection: boolean
}

/**
 * 고른 하위를 **새 묶음**으로(이름만 적으면 기간은 고른 것들에서) 또는 **이미 있는 묶음 밑**으로.
 *
 * - 새 묶음: 사건 생성 한 번(parentEventId = 이 사건, kind = 묶음, childEventIds = 고른 것) — 서버가 하위
 *   이동을 한 트랜잭션으로 한다(반쯤 옮겨진 상태가 남지 않는다).
 * - 기존 묶음: 고른 것마다 주 상위를 그 묶음으로. 고른 것 자신은 옮길 곳에서 뺀다(자기 밑으로는 못 간다).
 */
export function RegroupBar({
  parent,
  selected,
  candidates,
  onDone,
  onCancel,
}: {
  parent: { id: string; domain?: string | null }
  selected: RegroupCandidate[]
  /** 이 사건의 하위 중 묶음 — '기존 묶음으로 옮기기'의 행선지 */
  candidates: RegroupCandidate[]
  onDone: () => void
  onCancel: () => void
}) {
  const queryClient = useQueryClient()
  const [title, setTitle] = useState('')
  const [targetId, setTargetId] = useState('')
  const [busy, setBusy] = useState(false)

  const selectedIds = new Set(selected.map((item) => item.id))
  const targets = candidates.filter((candidate) => !selectedIds.has(candidate.id))
  const count = selected.length

  const groupIntoNew = async () => {
    const name = title.trim()
    if (!name || count === 0) return
    setBusy(true)
    try {
      const span = spanOfChildren(selected)
      const created = await createEvent({
        title: name,
        kind: 'COLLECTION',
        parentEventId: parent.id,
        ...(parent.domain ? { domain: parent.domain } : {}),
        ...(span ?? {}),
        childEventIds: selected.map((item) => item.id),
      } as CreateEventDto)
      invalidateEventQueries(queryClient, { eventId: parent.id })
      for (const item of selected) invalidateEventQueries(queryClient, { eventId: item.id })
      notify.success(`${count}건을 새 묶음 '${created.title ?? name}'으로 묶었습니다`)
      onDone()
    } catch (error) {
      notify.error(`묶지 못했습니다 — ${crossPatchErrorMessage(error)}`)
    } finally {
      setBusy(false)
    }
  }

  const moveInto = async () => {
    const target = targets.find((candidate) => candidate.id === targetId)
    if (!target || count === 0) return
    setBusy(true)
    let moved = 0
    try {
      for (const item of selected) {
        await updateEvent(item.id, { parentEventId: target.id } as UpdateEventDto)
        moved += 1
        invalidateEventQueries(queryClient, { eventId: item.id })
      }
      notify.success(`${moved}건을 '${target.title}' 밑으로 옮겼습니다`)
      onDone()
    } catch (error) {
      /* 하나씩 옮기므로 앞의 것은 이미 옮겨졌다 — 몇 건까지 됐는지 정직하게 알린다 */
      notify.error(`${moved}건 옮긴 뒤 멈췄습니다 — ${crossPatchErrorMessage(error)}`)
    } finally {
      invalidateEventQueries(queryClient, { eventId: parent.id })
      invalidateEventQueries(queryClient, { eventId: target.id })
      setBusy(false)
    }
  }

  return (
    <Bar role="region" aria-label="골라서 묶기" aria-busy={busy}>
      <BarCount>{count > 0 ? `${count}건 고름` : '묶을 하위 사건을 고르세요'}</BarCount>
      <BarGroup
        onSubmit={(submitEvent) => {
          submitEvent.preventDefault()
          void groupIntoNew()
        }}
      >
        <BarInput
          value={title}
          onChange={(changeEvent) => setTitle(changeEvent.target.value)}
          placeholder="새 묶음 이름 — 예: 7월 위기"
          aria-label="새 묶음 이름"
          disabled={busy}
        />
        <BarPrimary type="submit" disabled={busy || count === 0 || !title.trim()}>
          새 묶음으로 묶기
        </BarPrimary>
      </BarGroup>
      {targets.length > 0 && (
        <BarGroup
          onSubmit={(submitEvent) => {
            submitEvent.preventDefault()
            void moveInto()
          }}
        >
          <BarSelect
            value={targetId}
            onChange={(changeEvent) => setTargetId(changeEvent.target.value)}
            aria-label="옮겨 넣을 묶음"
            disabled={busy}
          >
            <option value="">기존 묶음 고르기</option>
            {targets.map((target) => (
              <option key={target.id} value={target.id}>
                {target.title}
              </option>
            ))}
          </BarSelect>
          <BarSecondary type="submit" disabled={busy || count === 0 || !targetId}>
            그 밑으로 옮기기
          </BarSecondary>
        </BarGroup>
      )}
      <BarCancel type="button" onClick={onCancel} disabled={busy}>
        그만
      </BarCancel>
    </Bar>
  )
}

/* ───────────────────────── 조판 ───────────────────────── */

const Segment = styled.span`
  display: inline-flex;
  padding: 2px;
  border-radius: ${RADIUS.PILL};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => ledgerBackground(theme.mode)};
`

const SegmentOption = styled.button<{ $active: boolean }>`
  padding: 2px 9px;
  border: none;
  border-radius: ${RADIUS.PILL};
  background: ${({ theme, $active }) => ($active ? ledgerAccentSubtle(theme.mode) : 'transparent')};
  font: inherit;
  font-size: 11.5px;
  font-weight: ${({ $active }) => ($active ? 700 : 500)};
  color: ${({ theme, $active }) => ($active ? ledgerAccent(theme.mode) : theme.colors.text.secondary)};
  cursor: pointer;

  &:hover:not(:disabled) {
    color: ${({ theme }) => theme.colors.text.primary};
  }
  &:disabled {
    cursor: progress;
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 1px;
  }
`

const ExpandButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 0 4px 0 0;
  border: none;
  background: none;
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  cursor: pointer;

  svg {
    width: 13px;
    height: 13px;
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 2px;
    border-radius: 2px;
  }
`

/** 손자 목록 — 행 본문 열 안쪽, 왼쪽 세로선 하나로 '이 묶음 밑'임을 말한다 */
const Nested = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 6px 0 2px;
  padding: 2px 0 2px 12px;
  border-left: 2px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
`

const NestedList = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 4px;

  li {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 2px 10px;
  }
`

const NestedTitle = styled(Link)`
  font-size: 13.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  text-decoration: none;

  &:hover {
    text-decoration: underline;
    text-underline-offset: 3px;
  }
`

const NestedDate = styled.span`
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  color: ${metaText};
`

const NestedKind = styled.span`
  padding: 0 6px;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  font-size: 11px;
  font-weight: 600;
  color: ${metaText};
`

const NestedNote = styled.p`
  margin: 0;
  font-size: 12.5px;
  color: ${metaText};
`

const NestedActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 16px;
`

/** 되돌리기 — 추가보다 한 단 낮은 목소리(회색) */
const NestedLift = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 0;
  border: none;
  background: none;
  font: inherit;
  font-size: 12.5px;
  font-weight: 500;
  color: ${metaText};
  cursor: pointer;

  svg {
    width: 12px;
    height: 12px;
  }
  &:hover:not(:disabled) {
    color: ${({ theme }) => theme.colors.text.primary};
  }
  &:disabled {
    cursor: progress;
  }
`

const NestedAdd = styled.button`
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 0;
  border: none;
  background: none;
  font: inherit;
  font-size: 12.5px;
  font-weight: 600;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  cursor: pointer;

  svg {
    width: 12px;
    height: 12px;
  }
  &:hover {
    text-decoration: underline;
    text-underline-offset: 3px;
  }
`

/**
 * 골라서 묶기 막대 — 목록을 내려가며 고르는 동안 늘 보이도록 지면 아래에 붙는다(sticky).
 * 면은 지면색 + 위 그림자 한 겹(목록 위에 떠 있음을 말할 최소한).
 */
const Bar = styled.div`
  position: sticky;
  bottom: 12px;
  z-index: 5;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
  max-width: 720px;
  margin-top: 12px;
  padding: 10px 12px;
  border-radius: ${RADIUS.MD};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => ledgerBackground(theme.mode)};
  box-shadow: ${({ theme }) =>
    theme.mode === 'dark' ? '0 6px 20px rgba(0, 0, 0, 0.5)' : '0 6px 20px rgba(15, 23, 42, 0.10)'};
`

const BarCount = styled.span`
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const BarGroup = styled.form`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
`

const BarInput = styled.input`
  width: 200px;
  max-width: 100%;
  padding: 6px 10px;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: transparent;
  font: inherit;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.primary};
`

const BarSelect = styled.select`
  max-width: 220px;
  padding: 6px 8px;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => ledgerBackground(theme.mode)};
  font: inherit;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.primary};
`

const BarPrimary = styled.button`
  padding: 6px 12px;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => ledgerAccent(theme.mode)};
  background: ${({ theme }) => ledgerAccent(theme.mode)};
  /* 채운 면의 전경은 지면색 — 다크 강조색은 밝은 인디고라 흰 글자가 묻힌다 */
  color: ${({ theme }) => ledgerBackground(theme.mode)};
  font: inherit;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
`

const BarSecondary = styled.button`
  padding: 6px 12px;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.primary};
  font: inherit;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
`

const BarCancel = styled.button`
  margin-left: auto;
  padding: 4px 2px;
  border: none;
  background: none;
  font: inherit;
  font-size: 12.5px;
  color: ${metaText};
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`
