/**
 * 정당 상세 — 「소속 인물·당직」: 평당원부터 당수·서기장까지 한 목록(B3, docs/political-party-model-review.md §4.6).
 *
 * 당직(지도부)은 당직 종류·대수로 정당끼리 같은 축이 된다 — '역대 서기장'. 기간은 연도만·기원전도.
 * 예전 한 줄 입력띠(브라우저 날짜 칸·수정 없음)를 등록·수정 모달로 바꿨다.
 */
import React, { useMemo, useState } from 'react'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FiEdit2, FiPlus, FiTrash2 } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'

import {
  deletePartyMembership,
} from '@/shared/api/election'
import { type PartyMembershipListRow, politicalPartyApi } from '@/shared/api/political-party'
import {
  formatPeriodLabel,
} from '@/shared/lib/party-dates'
import {
  PARTY_OFFICE_KIND_OPTIONS,
  formatPartyOffice,
  labelPartyMembershipLeadershipTier,
} from '@/shared/lib/party-membership-labels'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { pathKeys } from '@/shared/router'
import { ChartSkeleton } from '@/shared/ui/chart-skeleton/chart-skeleton'
import { confirm } from '@/shared/ui/confirm-dialog'
import { notify } from '@/shared/ui/toast'

import {
  PartyDescEmptyHint,
  PartyDescOutlineBtn,
  PartyDescSectionLabel,
  PartyDescSectionLabelRow,
  PartyDetailDescSection,
} from './country-politics-tab.styles'
import {
  FactActions,
  FactBadge,
  FactGroup,
  FactGroupLabel,
  FactList,
  FactMain,
  FactNote,
  FactRow,
  IconBtn,
} from '@/widgets/political-party/party-sidecar-parts'
import { PartyMembershipFormModal } from '@/widgets/political-party/party-membership-form-modal'

const membershipsKey = (partyId: string) => ['political-parties', partyId, 'memberships'] as const
const OFFICE_ORDER = PARTY_OFFICE_KIND_OPTIONS.map((option) => option.value as string)

function personName(person: PartyMembershipListRow['person']): string {
  if (!person) return '—'
  return getPersonDisplayName({
    name: person.name,
    surname: person.surname,
    middleName: person.middleName,
    nameDisplayOrder: person.nameDisplayOrder ?? null,
    country: person.country ?? null,
  })
}

/** 구조화 칸이 없던 옛 행은 거울 DATETIME으로 */
function membershipPeriodLabel(row: PartyMembershipListRow): string {
  if (row.startYear != null || row.endYear != null) return formatPeriodLabel(row)
  if (!row.startDate && !row.endDate) return ''
  return `${row.startDate?.slice(0, 10) ?? '—'} ~ ${row.endDate?.slice(0, 10) ?? ''}`
}

const startSortKey = (row: PartyMembershipListRow) =>
  row.startYear == null ? Number.POSITIVE_INFINITY : (row.startEra === 'BC' ? -row.startYear : row.startYear) * 10000 + (row.startMonth ?? 1) * 100 + (row.startDay ?? 1)

export function PartyMembershipsBlock({ partyId }: { partyId: string }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [modal, setModal] = useState<{ mode: 'create' } | { mode: 'edit'; row: PartyMembershipListRow } | null>(null)
  const { data = [], isLoading, isError } = useQuery({
    queryKey: membershipsKey(partyId),
    queryFn: () => politicalPartyApi.getMemberships(partyId),
  })

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: membershipsKey(partyId) })
    void queryClient.invalidateQueries({ queryKey: ['political-parties', partyId, 'top-leaders'] })
  }

  const deleteMut = useMutation({
    mutationFn: (payload: { personId: string; membershipId: string }) =>
      deletePartyMembership(payload.personId, payload.membershipId),
    onSuccess: () => {
      invalidate()
      notify.success('소속 기록을 지웠습니다.')
    },
    onError: (err: Error) => notify.error(err.message),
  })

  /** 당직 — 당직 종류 순 → 대수 → 시작, 그 밖 — 시작 순 */
  const { officers, members } = useMemo(() => {
    const leadership = data.filter((row) => row.roleCategory === 'LEADERSHIP')
    const others = data.filter((row) => row.roleCategory !== 'LEADERSHIP')
    leadership.sort(
      (left, right) =>
        (left.officeKind ? OFFICE_ORDER.indexOf(left.officeKind) : 99) - (right.officeKind ? OFFICE_ORDER.indexOf(right.officeKind) : 99) ||
        (left.officeOrdinal ?? 9999) - (right.officeOrdinal ?? 9999) ||
        startSortKey(left) - startSortKey(right),
    )
    others.sort((left, right) => startSortKey(left) - startSortKey(right))
    return { officers: leadership, members: others }
  }, [data])

  const renderRow = (row: PartyMembershipListRow) => {
    const name = personName(row.person)
    const office = formatPartyOffice(row)
    const tier = row.roleCategory === 'LEADERSHIP' ? labelPartyMembershipLeadershipTier(row.leadershipTier) : ''
    const period = membershipPeriodLabel(row)
    return (
      <FactRow key={row.id}>
        <FactMain>
          <span className="title">
            <PersonLink type="button" onClick={() => navigate(pathKeys.personsTimelineDetail(row.personId))}>
              {name}
            </PersonLink>
          </span>
          {office ? <span className="period strong">{office}</span> : null}
          {row.isFounder ? <FactBadge>창당 발기인</FactBadge> : null}
          {tier ? <span className="period">{tier}</span> : null}
          {period ? <span className="period">{period}</span> : null}
        </FactMain>
        {row.notes?.trim() ? <FactNote>{row.notes.trim()}</FactNote> : null}
        <FactActions>
          <IconBtn type="button" aria-label={`${name} 소속 고치기`} onClick={() => setModal({ mode: 'edit', row })}>
            <FiEdit2 size={13} />
          </IconBtn>
          <IconBtn
            type="button"
            aria-label={`${name} 소속 지우기`}
            disabled={deleteMut.isPending}
            onClick={async () => {
              const approved = await confirm({
                title: '소속 기록 지우기',
                message: `「${name}」의 ${office || '정당 소속'} 기록을 지울까요?`,
                confirmLabel: '지우기',
                danger: true,
              })
              if (approved) deleteMut.mutate({ personId: row.personId, membershipId: row.id })
            }}
          >
            <FiTrash2 size={13} />
          </IconBtn>
        </FactActions>
      </FactRow>
    )
  }

  return (
    <PartyDetailDescSection aria-label="소속 인물·당직">
      <PartyDescSectionLabelRow style={{ marginBottom: 10 }}>
        <PartyDescSectionLabel>소속 인물·당직</PartyDescSectionLabel>
        <PartyDescOutlineBtn type="button" onClick={() => setModal({ mode: 'create' })}>
          <FiPlus size={14} />
          소속 추가
        </PartyDescOutlineBtn>
      </PartyDescSectionLabelRow>
      {isLoading ? (
        <ChartSkeleton variant="text" lines={3} />
      ) : isError ? (
        <PartyDescEmptyHint>목록을 불러오지 못했습니다.</PartyDescEmptyHint>
      ) : data.length === 0 ? (
        <PartyDescEmptyHint>
          당수·서기장 같은 당직과 일반 당원을 기간과 함께 남깁니다. 당직은 종류·대수로 정당끼리 같은 축이 됩니다(역대 서기장).
        </PartyDescEmptyHint>
      ) : (
        <FactList>
          {officers.length > 0 ? (
            <FactGroup>
              <FactGroupLabel>당직 · {officers.length}명</FactGroupLabel>
              {officers.map(renderRow)}
            </FactGroup>
          ) : null}
          {members.length > 0 ? (
            <FactGroup>
              <FactGroupLabel>당원·기타 · {members.length}명</FactGroupLabel>
              {members.map(renderRow)}
            </FactGroup>
          ) : null}
        </FactList>
      )}
      {modal ? (
        <PartyMembershipFormModal
          key={modal.mode === 'edit' ? modal.row.id : 'new'}
          anchor={{ kind: 'party', partyId }}
          initial={modal.mode === 'edit' ? modal.row : undefined}
          onClose={() => setModal(null)}
          onSaved={() => {
            invalidate()
            setModal(null)
          }}
        />
      ) : null}
    </PartyDetailDescSection>
  )
}

const PersonLink = styled.button`
  padding: 0;
  border: none;
  background: none;
  font: inherit;
  color: ${({ theme }) => theme.colors.primary};
  cursor: pointer;

  &:hover {
    text-decoration: underline;
    text-underline-offset: 3px;
  }
`

