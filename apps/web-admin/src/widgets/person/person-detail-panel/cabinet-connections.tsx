/**
 * 같은 행정부(Cabinet) 동료 — 인물 상세 재임 카드 하위의 접이식 섹션.
 * 대통령↔부통령처럼 같은 행정부에 속한 다른 직위의 인물들을 연결해 보여준다.
 * - 펼칠 때 lazy 로드(useQuery enabled)로 행정부 한눈에 보기(overview)를 가져온다.
 * - 수반(head) + 각료(members) + 여당/연정(parties)을 표시하고, 인물명은 링크로 이동.
 */
import { useState } from 'react'
import { FiChevronDown, FiChevronRight, FiUsers } from 'react-icons/fi'
import { useQuery } from '@tanstack/react-query'
import styled from 'styled-components'

import {
  personCareerApi,
  type CabinetOverviewTenure,
} from '@/shared/api/person-career'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'

import { parseIsoDateParts } from './helpers'

const CABINET_PARTY_ROLE_LABELS: Record<string, string> = {
  LEADING: '여당',
  COALITION_PARTNER: '연정',
  SUPPORTING_MINOR: '소수 여당',
  OTHER: '기타',
}

function yearLabel(iso?: string | null): string | null {
  const p = parseIsoDateParts(iso)
  if (!p) return null
  return p.era === 'BC' ? `BC ${p.year}` : `${p.year}`
}

function periodLabel(t: {
  startDate?: string | null
  endDate?: string | null
}): string {
  const s = yearLabel(t.startDate)
  const e = yearLabel(t.endDate)
  if (!s && !e) return ''
  return `${s ?? '?'}–${e ?? '현재'}`
}

/** 각료 정렬: 직위 rank 오름차순(낮을수록 상위), 없으면 뒤로, 그다음 시작일 */
function sortMembers(members: CabinetOverviewTenure[]): CabinetOverviewTenure[] {
  return [...members].sort((a, b) => {
    const ra = a.positionDefinition?.rank ?? Number.MAX_SAFE_INTEGER
    const rb = b.positionDefinition?.rank ?? Number.MAX_SAFE_INTEGER
    if (ra !== rb) return ra - rb
    return (a.startDate ?? '').localeCompare(b.startDate ?? '')
  })
}

interface CabinetConnectionsProps {
  cabinetId: string
  /** 현재 보고 있는 인물 — 본인 행은 링크 대신 강조 표시 */
  currentPersonId?: string | null
  onPersonClick: (id: string) => void
  /** 토글 시 클릭음 등 */
  onToggle?: () => void
}

export function CabinetConnections({
  cabinetId,
  currentPersonId,
  onPersonClick,
  onToggle,
}: CabinetConnectionsProps) {
  const [open, setOpen] = useState(false)
  const { data, isLoading, isError } = useQuery({
    queryKey: ['cabinet-overview', cabinetId],
    queryFn: () => personCareerApi.getCabinetOverview(cabinetId),
    enabled: open,
    staleTime: 5 * 60 * 1000,
  })

  const head = data?.headTenure ?? null
  const members = data ? sortMembers(data.memberTenures) : []
  const parties = data?.politicalParties ?? []
  const rows: Array<{ t: CabinetOverviewTenure; isHead: boolean }> = [
    ...(head ? [{ t: head, isHead: true }] : []),
    ...members.map((t) => ({ t, isHead: false })),
  ]
  const isEmpty = Boolean(data) && rows.length === 0

  return (
    <Wrap>
      <ToggleBtn
        type="button"
        onClick={() => {
          onToggle?.()
          setOpen((v) => !v)
        }}
        aria-expanded={open}
      >
        {open ? <FiChevronDown size={12} /> : <FiChevronRight size={12} />}
        <FiUsers size={11} />
        <span>같은 행정부</span>
      </ToggleBtn>
      {open && (
        <Body>
          {isLoading && <Muted>불러오는 중…</Muted>}
          {isError && <Muted>행정부 정보를 불러오지 못했습니다.</Muted>}
          {isEmpty && <Muted>등록된 행정부 구성원이 없습니다.</Muted>}
          {data && rows.length > 0 && (
            <>
              {data.name && <CabinetName>{data.name}</CabinetName>}
              <MemberList>
                {rows.map(({ t, isHead }) => {
                  const isCurrent =
                    !!currentPersonId && t.person?.id === currentPersonId
                  const posTitle =
                    t.positionDefinition?.title ?? t.title ?? '직책'
                  const name = t.person ? getPersonDisplayName(t.person) : '미상'
                  const period = periodLabel(t)
                  return (
                    <MemberRow key={t.id} $head={isHead}>
                      <PosChip $head={isHead}>{posTitle}</PosChip>
                      {isCurrent || !t.person?.id ? (
                        <SelfName>
                          {name}
                          {isCurrent && <SelfTag>이 인물</SelfTag>}
                        </SelfName>
                      ) : (
                        <PersonLink
                          type="button"
                          onClick={() => onPersonClick(t.person!.id)}
                        >
                          {name}
                        </PersonLink>
                      )}
                      {period && <Period>{period}</Period>}
                    </MemberRow>
                  )
                })}
              </MemberList>
              {parties.length > 0 && (
                <PartyRow>
                  {parties.map((p) => (
                    <PartyChip key={p.id} $color={p.party.brandColor}>
                      <PartyDot $color={p.party.brandColor} />
                      {p.party.shortName || p.party.name}
                      <PartyRole>
                        {CABINET_PARTY_ROLE_LABELS[p.role] ?? p.role}
                      </PartyRole>
                    </PartyChip>
                  ))}
                </PartyRow>
              )}
            </>
          )}
        </Body>
      )}
    </Wrap>
  )
}

/* 토글은 점선 seam 아래에 놓여 승계·업적 소섹션과 같은 방언으로 구분된다. */
const Wrap = styled.div`
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.09)' : 'rgba(15,23,42,0.09)'};
`

/* 인디고 필 → 무박스 인디고 텍스트 토글(AchievementToggle와 동일 어포던스).
   종류 액센트(인디고)만 남기고 chrome 제거. */
const ToggleBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 4px;
  border: none;
  background: transparent;
  border-radius: 6px;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#a5b4fc' : '#4338ca')};
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  transition: color 0.15s ease;

  &:hover {
    color: ${({ theme }) => (theme.mode === 'dark' ? '#c7d2fe' : '#3730a3')};
  }
  &:focus-visible {
    outline: 2px solid #6366f1;
    outline-offset: 2px;
  }
`

/* 두 번째 border-left + 인디고 틴트 박스를 제거 — 토글 아래 6px 들여쓴 평평한 흐름.
   자식 간격(CabinetName·MemberList·PartyRow)은 그대로라 리플로우 없음. */
const Body = styled.div`
  margin-top: 8px;
  padding: 0 0 0 6px;
`

const Muted = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const CabinetName = styled.div`
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-bottom: 6px;
`

const MemberList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const MemberRow = styled.div<{ $head?: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  ${({ $head }) => $head && 'font-weight: 600;'}
`

const PosChip = styled.span<{ $head?: boolean }>`
  flex-shrink: 0;
  padding: 1px 7px;
  border-radius: 999px;
  font-size: 10.5px;
  font-weight: 700;
  background: ${({ $head, theme }) =>
    $head
      ? theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.26)'
        : 'rgba(99, 102, 241, 0.18)'
      : theme.mode === 'dark'
        ? 'rgba(148, 163, 184, 0.18)'
        : 'rgba(100, 116, 139, 0.12)'};
  color: ${({ $head, theme }) =>
    $head
      ? theme.mode === 'dark'
        ? '#a5b4fc'
        : '#4338ca'
      : theme.colors.text.secondary};
`

const PersonLink = styled.button`
  padding: 0;
  border: none;
  background: none;
  color: ${({ theme }) => (theme.mode === 'dark' ? '#a5b4fc' : '#4f46e5')};
  font-size: 12.5px;
  font-weight: inherit;
  cursor: pointer;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`

const SelfName = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.primary};
`

const SelfTag = styled.span`
  padding: 0px 5px;
  border-radius: 999px;
  font-size: 9.5px;
  font-weight: 700;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(16, 185, 129, 0.22)'
      : 'rgba(16, 185, 129, 0.14)'};
  color: ${({ theme }) => (theme.mode === 'dark' ? '#6ee7b7' : '#059669')};
`

const Period = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const PartyRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 8px;
  padding-top: 7px;
  border-top: 1px dashed
    ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(148, 163, 184, 0.25)'
        : 'rgba(100, 116, 139, 0.2)'};
`

const PartyChip = styled.span<{ $color?: string | null }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 1px 7px;
  border-radius: 999px;
  font-size: 10.5px;
  font-weight: 600;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(148, 163, 184, 0.16)'
      : 'rgba(100, 116, 139, 0.1)'};
  color: ${({ theme }) => theme.colors.text.secondary};
`

const PartyDot = styled.span<{ $color?: string | null }>`
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: ${({ $color, theme }) =>
    $color ||
    (theme.mode === 'dark'
      ? 'rgba(148, 163, 184, 0.6)'
      : 'rgba(100, 116, 139, 0.5)')};
`

const PartyRole = styled.span`
  font-size: 9.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.tertiary};
`
