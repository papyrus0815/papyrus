/**
 * 인물 상세 — 정당 소속 + 선거 후보 이력(상세 API에서 로드)
 * 당원 소속 추가·수정: 정당 지면과 같은 모달(widgets/political-party/party-membership-form-modal) — 구조화 기간·당직
 */
import {
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import {
  FiEdit2,
  FiFlag,
  FiPlus,
  FiTrash2,
} from 'react-icons/fi'
import { useImperativeHandle, useMemo, useState } from 'react'
import styled from 'styled-components'

import {
  deletePartyMembership,
  type PartyMembershipRow,
} from '@/shared/api/election'
import { personKeys } from '@/entities/person/query-keys'
import { useClickSound } from '@/shared/hooks/use-click-sound.hook'
import {
  compareByDate,
  parseIsoDateParts,
} from '@/shared/lib/iso-date'
import { ConfirmDialog } from '@/shared/ui/confirm-dialog/confirm-dialog'
import {
  FieldControl,
  FieldRow,
  FormRows,
} from '@/shared/ui/register-form-layout'
import { notify } from '@/shared/ui/toast'
import {
  formatPartyOffice,
  labelPartyMembershipLeadershipTier,
  labelPartyMembershipRoleCategory,
} from '@/shared/lib/party-membership-labels'
import { formatPartialDate, partialSortKey } from '@/shared/lib/party-dates'
import { partialDateFromStructured } from '@/shared/lib/partial-date-string'
import { PartyMembershipFormModal } from '@/widgets/political-party/party-membership-form-modal'
/** 인물 상세 API의 선거 후보 요약 (상세 패널과 공유) */
export type ElectionCandidacyDetail = {
  id: string
  nominationType: string
  ballotOrder?: number | null
  listRank?: number | null
  withdrawnDate?: string | null
  notes?: string | null
  party?: { id: string; name: string; shortName?: string | null } | null
  electoralDistrict?: { id: string; name: string; code?: string | null } | null
  election?: {
    id: string
    name: string
    shortName?: string | null
    pollDate: string
    electionType: string
  } | null
  result?: {
    votes?: string | null
    voteSharePercent?: string | null
    elected?: boolean
    resultRank?: number | null
  } | null
}

function formatYmdKo(ymd: string) {
  if (!ymd) return ''
  const parsed = parseIsoDateParts(ymd)
  if (parsed) {
    const yearStr =
      parsed.year < 0 ? `기원전 ${Math.abs(parsed.year)}` : `${parsed.year}`
    return `${yearStr}. ${parsed.month}. ${parsed.day}.`
  }
  try {
    return new Date(`${ymd}T12:00:00.000Z`).toLocaleDateString('ko-KR')
  } catch {
    return ymd
  }
}

/** 상세 API·직렬화에 따라 ISO 문자열 또는 Date가 올 수 있음. (구버전 API는 Date가 `{}`로 깨질 수 있음) */
function membershipDateToYmd(
  value: string | Date | Record<string, never> | null | undefined,
): string {
  if (value == null) return ''
  if (typeof value === 'object' && !(value instanceof Date)) {
    if (Object.keys(value).length === 0) return ''
  }
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return ''
    return value.toISOString().split('T')[0] ?? ''
  }
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return ''
    return trimmed.split('T')[0] ?? trimmed
  }
  return ''
}

/** 소속 시작·끝(부분 정밀 부호 문자열) — 구조화 칸이 진실, 없던 옛 응답은 거울 DATETIME */
function membershipStartOn(row: PartyMembershipRow): string {
  if (row.startYear != null) return partialDateFromStructured(row.startYear, row.startMonth, row.startDay, row.startEra)
  return membershipDateToYmd(row.startDate as string | Date | null)
}

function membershipEndOn(row: PartyMembershipRow): string {
  if (row.endYear != null) return partialDateFromStructured(row.endYear, row.endMonth, row.endDay, row.endEra)
  return membershipDateToYmd(row.endDate as string | Date | null)
}

/** '1921년 11월 9일 ~ 1943년' · 끝이 비면 생존 인물은 '현재', 고인은 '미상' */
function membershipPeriodText(row: PartyMembershipRow, isDeceased: boolean): { text: string; ongoing: boolean; hasStart: boolean } {
  const startOn = membershipStartOn(row)
  const endOn = membershipEndOn(row)
  const startText = startOn ? formatPartialDate(startOn) : '미상'
  const endText = endOn ? formatPartialDate(endOn) : isDeceased ? '미상' : '현재'
  return { text: `${startText} ~ ${endText}`, ongoing: !endOn && Boolean(startOn) && !isDeceased, hasStart: Boolean(startOn) }
}

type Props = {
  personId: string
  countryId?: string | null
  partyMemberships: PartyMembershipRow[] | undefined
  electionCandidacies: ElectionCandidacyDetail[] | undefined
  /**
   * 개요에 섞일 때 구분선·여백. 탭 전용이면 상단 구분선 제거.
   * 'overview' — 인물 상세 개요의 '이력·활동' 안(옛 정치·선거 탭을 흡수). 큰 머리(아이콘·설명·
   * 버튼)를 그리지 않고 부모가 재임·재위와 같은 작은 머리를 단다. 추가는 `actionsRef.openCreate()`.
   * 당원·후보가 모두 없으면 한 줄만 — 대부분의 인물이 빈 상태라 두 소제목+두 빈 문장을 세우지 않는다.
   */
  variant?: 'standalone' | 'tab' | 'overview'
  /** 'overview'에서 부모 머리의 추가 버튼이 등록 모달을 여는 손잡이 */
  actionsRef?: React.Ref<PersonPoliticsSectionActions>
  /** 목록 아래 덧붙일 내용 — 개요에서는 당 지도부 이력 */
  footer?: React.ReactNode
  /** 고인 여부 — 종료일이 비어 있을 때 '현재' 대신 '미상'으로 표시하고 진행중 강조를 해제 */
  isDeceased?: boolean
  /** 읽기 전용(모달 임베드 등) — 추가·수정·삭제 액션을 숨김 */
  readOnly?: boolean
}

export interface PersonPoliticsSectionActions {
  openCreate: () => void
}

export function PersonPoliticsSection({
  personId,
  countryId,
  partyMemberships: membershipsProp,
  electionCandidacies: candidaciesProp,
  variant = 'standalone',
  actionsRef,
  footer,
  isDeceased = false,
  readOnly = false,
}: Props) {
  const queryClient = useQueryClient()
  const playClickSound = useClickSound()
  /** 소속·당직 모달 — 정당 지면과 같은 모달(구조화 기간·당직). null이면 닫힘 */
  const [membershipModal, setMembershipModal] = useState<
    { mode: 'create' } | { mode: 'edit'; row: PartyMembershipRow } | null
  >(null)
  /** 삭제 확인 대상 (당원 소속 행). null이면 다이얼로그 닫힘 */
  const [deleteTarget, setDeleteTarget] = useState<PartyMembershipRow | null>(
    null,
  )

  const isMembershipModalOpen = membershipModal !== null

  const memberships = useMemo(() => {
    const raw = membershipsProp ?? []
    /* 구조화 시작(기원전 인지) 오래된 순, 모르면 뒤 */
    const key = (row: PartyMembershipRow) => partialSortKey(membershipStartOn(row)) ?? Number.POSITIVE_INFINITY
    return raw.slice().sort((left, right) => key(left) - key(right))
  }, [membershipsProp])

  const invalidatePerson = () => {
    queryClient.invalidateQueries({ queryKey: personKeys.detailFull(personId) })
    queryClient.invalidateQueries({ queryKey: ['person-detail', personId] })
    queryClient.invalidateQueries({ queryKey: personKeys.all })
    queryClient.invalidateQueries({ queryKey: personKeys.infographic })
    queryClient.invalidateQueries({ queryKey: ['persons', 'compare-records'] })
    queryClient.invalidateQueries({
      queryKey: ['person-record-event-suggestions', personId],
    })
  }

  const deleteMut = useMutation({
    mutationFn: (id: string) => deletePartyMembership(personId, id),
    onSuccess: () => {
      notify.success('삭제했습니다.')
      invalidatePerson()
    },
    onError: (e: unknown) => {
      notify.error(e instanceof Error ? e.message : String(e))
    },
  })

  const startEdit = (row: PartyMembershipRow) => {
    if (readOnly) return
    setMembershipModal({ mode: 'edit', row })
  }

  const openCreateModal = () => {
    if (readOnly) return
    setMembershipModal({ mode: 'create' })
  }

  useImperativeHandle(actionsRef, () => ({ openCreate: openCreateModal }))

  const candidacies = candidaciesProp ?? []

  const candidacySummary = useMemo(() => {
    return candidacies
      .slice()
      .sort((a, b) =>
        compareByDate(a.election?.pollDate ?? null, b.election?.pollDate ?? null),
      )
      .map((candidacy) => ({
        ...candidacy,
        pollLabel: candidacy.election?.pollDate
          ? formatYmdKo(membershipDateToYmd(candidacy.election.pollDate)) || '—'
          : '—',
      }))
  }, [candidacies])

  return (
    <Root $variant={variant}>
      {variant !== 'overview' && (
      <HeaderRow>
        <TitleBlock>
          <HeaderIconBadge aria-hidden>
            <FiFlag size={20} strokeWidth={2} />
          </HeaderIconBadge>
          <TitleText>
            <SectionTitle>정당·선거</SectionTitle>
            <SectionDesc>
              {variant === 'tab' ? (
                <>
                  당원 소속을 관리하고, 선거 후보 이력을 확인합니다. (후보 등록은
                  선거 데이터에서)
                </>
              ) : (
                <>
                  <strong>당원 소속</strong>은 기간·정당을 기록하고,{' '}
                  <strong>선거 후보</strong>는 선거 단위에서 등록한 내역이 여기에
                  표시됩니다.
                </>
              )}
            </SectionDesc>
          </TitleText>
        </TitleBlock>
        {!readOnly && !isMembershipModalOpen ? (
          <HeaderBtn type="button" onClick={openCreateModal}>
            <FiPlus size={17} strokeWidth={2.5} />
            당원 소속 추가
          </HeaderBtn>
        ) : null}
      </HeaderRow>
      )}

      {membershipModal ? (
        <PartyMembershipFormModal
          key={membershipModal.mode === 'edit' ? membershipModal.row.id : 'new'}
          anchor={{ kind: 'person', personId, countryId }}
          initial={
            membershipModal.mode === 'edit'
              ? {
                  ...membershipModal.row,
                  partyId: membershipModal.row.partyId ?? membershipModal.row.party?.id ?? null,
                }
              : undefined
          }
          onClose={() => setMembershipModal(null)}
          onSaved={() => {
            setMembershipModal(null)
            invalidatePerson()
          }}
        />
      ) : null}

      {variant === 'overview' &&
      memberships.length === 0 &&
      candidacySummary.length === 0 ? null : (
      <>
      {(variant !== 'overview' || memberships.length > 0) && (
      <>
      {variant === 'overview' ? (
        <OverviewSubTitle>
          <span>당원·소속 이력</span>
          <OverviewSubCount>{memberships.length}</OverviewSubCount>
        </OverviewSubTitle>
      ) : (
        <SubTitle>당원·소속 이력</SubTitle>
      )}
      {memberships.length === 0 ? (
        <Empty>등록된 당원 소속이 없습니다.</Empty>
      ) : variant === 'overview' ? (
        <OverviewList>
          {memberships.map((membershipRow) => {
            const roleCatLabel = labelPartyMembershipRoleCategory(membershipRow.roleCategory) || '—'
            const tierLabel =
              membershipRow.roleCategory === 'LEADERSHIP'
                ? labelPartyMembershipLeadershipTier(membershipRow.leadershipTier) || null
                : null
            /* 당직(제N대 서기장)이 있으면 직함 자리에 — formatPartyOffice가 직함을 함께 붙인다 */
            const officeLabel = membershipRow.officeKind ? formatPartyOffice(membershipRow) : null
            const period = membershipPeriodText(membershipRow, isDeceased)
            const periodLabel = period.text
            const isOngoing = period.ongoing
            const startYmd = period.hasStart
            return (
              <OverviewItem
                key={membershipRow.id}
                id={
                  membershipRow.id
                    ? `person-record-partymem-${membershipRow.id}`
                    : undefined
                }
              >
                {!readOnly && (
                  <OverviewActionGroup>
                    <OverviewActionBtn
                      type="button"
                      aria-label="수정"
                      onClick={() => startEdit(membershipRow)}
                    >
                      <FiEdit2 size={12} />
                    </OverviewActionBtn>
                    <OverviewActionBtn
                      type="button"
                      $danger
                      aria-label="삭제"
                      disabled={deleteMut.isPending}
                      onClick={() => setDeleteTarget(membershipRow)}
                    >
                      <FiTrash2 size={13} />
                    </OverviewActionBtn>
                  </OverviewActionGroup>
                )}
                <OverviewDateCol $ongoing={isOngoing} $muted={!startYmd}>
                  {periodLabel}
                </OverviewDateCol>
                <OverviewMainCol>
                  <OverviewHeader>
                    <OverviewTitle>
                      {membershipRow.party?.name ?? membershipRow.partyId}
                    </OverviewTitle>
                    {officeLabel ? (
                      <OverviewRoleBadge $accent>{officeLabel}</OverviewRoleBadge>
                    ) : membershipRow.roleTitle ? (
                      <OverviewRoleBadge $accent>
                        {membershipRow.roleTitle}
                      </OverviewRoleBadge>
                    ) : null}
                    {membershipRow.isFounder ? <OverviewRoleBadge>창당 발기인</OverviewRoleBadge> : null}
                    <OverviewRoleBadge>{roleCatLabel}</OverviewRoleBadge>
                    {tierLabel && (
                      <OverviewRoleBadge>{tierLabel}</OverviewRoleBadge>
                    )}
                  </OverviewHeader>
                  {membershipRow.notes && (
                    <OverviewNotes>{membershipRow.notes}</OverviewNotes>
                  )}
                </OverviewMainCol>
              </OverviewItem>
            )
          })}
        </OverviewList>
      ) : (
        <TableScrollWrap>
        <Table>
          <thead>
            <tr>
              <th>정당</th>
              <th>역할 분류</th>
              <th>지도부 위계</th>
              <th>기간</th>
              <th>직함·세부</th>
              {!readOnly && <th />}
            </tr>
          </thead>
          <tbody>
            {memberships.map((membershipRow) => (
              <tr key={membershipRow.id}>
                <td>{membershipRow.party?.name ?? membershipRow.partyId}</td>
                <td>{labelPartyMembershipRoleCategory(membershipRow.roleCategory) || '—'}</td>
                <td>
                  {membershipRow.roleCategory === 'LEADERSHIP'
                    ? labelPartyMembershipLeadershipTier(membershipRow.leadershipTier) || '위계 미지정'
                    : '—'}
                </td>
                <td>{membershipPeriodText(membershipRow, isDeceased).text}</td>
                <td>{formatPartyOffice(membershipRow) || '—'}</td>
                {!readOnly && (
                  <td>
                    <IconBtn
                      type="button"
                      aria-label="수정"
                      onClick={() => startEdit(membershipRow)}
                    >
                      <FiEdit2 size={14} />
                    </IconBtn>
                    <IconBtn
                      type="button"
                      $danger
                      aria-label="삭제"
                      disabled={deleteMut.isPending}
                      onClick={() => setDeleteTarget(membershipRow)}
                    >
                      <FiTrash2 size={14} />
                    </IconBtn>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </Table>
        </TableScrollWrap>
      )}
      </>
      )}
      {(variant !== 'overview' || candidacySummary.length > 0) && (
      <>
      {variant === 'overview' ? (
        <OverviewSubTitle
          style={{
            marginTop: memberships.length === 0 ? 4 : 18,
          }}
        >
          <span>선거 후보 이력</span>
          <OverviewSubCount>{candidacySummary.length}</OverviewSubCount>
        </OverviewSubTitle>
      ) : (
        <SubTitle style={{ marginTop: 22 }}>
          선거 후보 이력
        </SubTitle>
      )}
      {candidacySummary.length === 0 ? (
        <Empty>
          후보로 등록된 선거가 없습니다. 선거(선거관리)에서 후보를 추가하면
          표시됩니다.
        </Empty>
      ) : variant === 'overview' ? (
        <OverviewList>
          {candidacySummary.map((candidacyRow) => {
            const metaBits = [
              candidacyRow.party?.name ?? null,
              candidacyRow.electoralDistrict?.name
                ? `선거구: ${candidacyRow.electoralDistrict.name}`
                : null,
              candidacyRow.result?.voteSharePercent != null
                ? `득표율 ${String(candidacyRow.result.voteSharePercent)}%`
                : null,
            ].filter(Boolean) as string[]
            const hasPollDate = candidacyRow.pollLabel !== '—'
            return (
              <OverviewItem
                key={candidacyRow.id}
                id={
                  candidacyRow.id
                    ? `person-record-candidacy-${candidacyRow.id}`
                    : undefined
                }
              >
                <OverviewDateCol $muted={!hasPollDate}>
                  {hasPollDate ? candidacyRow.pollLabel : '일자 미상'}
                </OverviewDateCol>
                <OverviewMainCol>
                  <OverviewHeader>
                    <OverviewTitle>
                      {candidacyRow.election?.name ?? '선거'}
                    </OverviewTitle>
                    {candidacyRow.result?.elected && (
                      <ElectedBadge>당선</ElectedBadge>
                    )}
                  </OverviewHeader>
                  {metaBits.length > 0 && (
                    <OverviewMeta>{metaBits.join(' · ')}</OverviewMeta>
                  )}
                </OverviewMainCol>
              </OverviewItem>
            )
          })}
        </OverviewList>
      ) : (
        <CandidacyList>
          {candidacySummary.map((candidacyRow) => (
            <CandidacyCard key={candidacyRow.id}>
              <CandidacyTop>
                <strong>{candidacyRow.election?.name ?? '선거'}</strong>
                <span>{candidacyRow.pollLabel}</span>
                {candidacyRow.result?.elected && <ElectedBadge>당선</ElectedBadge>}
              </CandidacyTop>
              <CandidacyMeta>
                {candidacyRow.party?.name && <span>{candidacyRow.party.name}</span>}
                {candidacyRow.electoralDistrict?.name && (
                  <span>선거구: {candidacyRow.electoralDistrict.name}</span>
                )}
                {candidacyRow.result?.voteSharePercent != null && (
                  <span>득표율 {String(candidacyRow.result.voteSharePercent)}%</span>
                )}
              </CandidacyMeta>
            </CandidacyCard>
          ))}
        </CandidacyList>
      )}
      </>
      )}
      </>
      )}
      {footer}

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        danger
        title="당원 소속 삭제"
        confirmLabel={deleteMut.isPending ? '삭제 중…' : '삭제'}
        cancelLabel="취소"
        message={
          deleteTarget ? (
            <>
              <strong>
                {deleteTarget.party?.name ?? deleteTarget.partyId}
              </strong>{' '}
              소속 기록(
              {membershipPeriodText(deleteTarget, isDeceased).text})을(를) 삭제할까요? 이
              작업은 되돌릴 수 없습니다.
            </>
          ) : (
            ''
          )
        }
        onCancel={() => {
          if (deleteMut.isPending) return
          setDeleteTarget(null)
        }}
        onConfirm={() => {
          if (!deleteTarget || deleteMut.isPending) return
          deleteMut.mutate(deleteTarget.id, {
            onSettled: () => setDeleteTarget(null),
          })
        }}
      />
    </Root>
  )
}

/* 이 모달 전용 — 공용 FieldRow(라벨 열 360px)는 넓은 국가 폼 기준이라 좁은 모달에선 라벨 열을 줄인다 */
const CompactFormRows = styled(FormRows)`
  ${FieldRow} {
    grid-template-columns: 120px minmax(0, 1fr);
    gap: 16px;
    padding: 14px 0;

    @media (max-width: 640px) {
      grid-template-columns: 1fr;
      gap: 8px;
    }
  }
`

const FullWidthFieldControl = styled(FieldControl)`
  max-width: 100% !important;
  width: 100%;
`

const ModalFieldMedium = styled(FieldControl)`
  max-width: min(400px, 100%) !important;
`

const ModalSelect = styled.select`
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  padding: 12px 14px;
  font-size: 15px;
  line-height: 1.45;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.06)' : '#fff'};
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: pointer;
  &:focus {
    outline: none;
    border-color: #6366f1;
  }
`

const ModalHint = styled.p`
  margin: 8px 0 0;
  font-size: 12px;
  line-height: 1.45;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const SelectClearRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  max-width: 100%;
`

const ClearFieldBtn = styled.button`
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 10px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#fff'};
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  transition: border-color 0.15s ease;
  &:hover {
    border-color: #6366f1;
  }
`

const Root = styled.section<{ $variant: 'standalone' | 'tab' | 'overview' }>`
  margin-top: ${({ $variant }) => ($variant === 'standalone' ? '4px' : '0')};
  padding-top: ${({ $variant }) => ($variant === 'standalone' ? '22px' : '0')};
  border-top: ${({ $variant, theme }) =>
    $variant !== 'standalone'
      ? 'none'
      : `1px solid ${
          theme.mode === 'dark'
            ? 'rgba(255,255,255,0.06)'
            : 'rgba(226, 232, 240, 0.9)'
        }`};
`

const HeaderRow = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
`

const TitleBlock = styled.div`
  display: flex;
  gap: 14px;
  align-items: flex-start;
  min-width: 0;
`

const HeaderIconBadge = styled.div`
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #0d9488;
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'linear-gradient(145deg, rgba(13,148,136,0.22), rgba(15,118,110,0.1))'
      : 'linear-gradient(145deg, rgba(204,251,241,0.9), rgba(255,255,255,0.5))'};
`

const TitleText = styled.div`
  min-width: 0;
`

const SectionTitle = styled.h3`
  margin: 0 0 6px;
  font-size: 16px;
  font-weight: 800;
  letter-spacing: -0.03em;
  color: ${({ theme }) => theme.colors.text.primary};
`

const SectionDesc = styled.p`
  margin: 0;
  font-size: 12.5px;
  line-height: 1.55;
  color: ${({ theme }) => theme.colors.text.secondary};
  max-width: 58ch;
  strong {
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const HeaderBtn = styled.button<{ $ghost?: boolean }>`
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 10px 18px;
  font-size: 13px;
  font-weight: 700;
  border-radius: 12px;
  cursor: pointer;
  border: 1px solid
    ${({ theme, $ghost }) =>
      $ghost
        ? theme.mode === 'dark'
          ? 'rgba(255,255,255,0.1)'
          : '#e2e8f0'
        : 'rgba(13, 148, 136, 0.45)'};
  color: ${({ $ghost, theme }) =>
    $ghost ? theme.colors.text.secondary : '#0f766e'};
  background: ${({ $ghost, theme }) =>
    $ghost
      ? theme.mode === 'dark'
        ? 'rgba(255,255,255,0.04)'
        : '#f8fafc'
      : 'linear-gradient(180deg, rgba(13,148,136,0.12), rgba(13,148,136,0.06))'};
`

const SubTitle = styled.h4`
  margin: 0 0 10px;
  font-size: 13px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.text.primary};
`

const Empty = styled.p<{ $muted?: boolean }>`
  margin: 0;
  font-size: ${({ $muted }) => ($muted ? '12.5px' : '13px')};
  line-height: 1.5;
  color: ${({ theme, $muted }) =>
    $muted ? theme.colors.text.tertiary : theme.colors.text.secondary};
`

const TableScrollWrap = styled.div`
  width: 100%;
  max-width: 100%;
  overflow-x: auto;
`

const Table = styled.table`
  width: 100%;
  min-width: 480px;
  border-collapse: collapse;
  font-size: 13px;
  th,
  td {
    padding: 8px 10px;
    text-align: left;
    border-bottom: 1px solid
      ${({ theme }) =>
        theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#f1f5f9'};
  }
  /* 글자색을 물려받지 않게 못 박는다 — 상위 지면 색을 물려받아 셀 글자가 거의 안 보였다(실측) */
  td {
    color: ${({ theme }) => theme.colors.text.primary};
  }
  th {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    white-space: nowrap;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
  td:last-child {
    white-space: nowrap;
    text-align: right;
  }
`

const IconBtn = styled.button<{ $danger?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px 6px;
  margin-left: 4px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  background: transparent;
  color: ${({ $danger }) => ($danger ? '#e11d48' : '#64748b')};
`

const CandidacyList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`

const CandidacyCard = styled.div`
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid
    ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#e2e8f0'};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : '#fafafa'};
`

const CandidacyTop = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.primary};
`

const CandidacyMeta = styled.div`
  margin-top: 6px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const ElectedBadge = styled.span`
  font-size: 11px;
  font-weight: 800;
  padding: 2px 8px;
  border-radius: 999px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(20, 184, 166, 0.22)' : 'rgba(13, 148, 136, 0.15)'};
  color: ${({ theme }) => (theme.mode === 'dark' ? '#5eead4' : '#0f766e')};
`

const OverviewSubTitle = styled.h4`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  margin: 4px 0 2px;
  padding: 2px 0 2px 9px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: ${({ theme }) => theme.colors.text.secondary};
  background: transparent;
  border-left: 2.5px solid
    ${({ theme }) => (theme.mode === 'dark' ? '#818cf8' : '#6366f1')};
`

const OverviewSubCount = styled.span`
  font-size: 11px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const OverviewList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0;
`

const OverviewActionGroup = styled.div`
  position: absolute;
  top: 10px;
  right: 6px;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  gap: 2px;
  opacity: 0.35;
  transition: opacity 0.15s ease;
  @media (hover: none) {
    opacity: 0.85;
  }
`

const OverviewItem = styled.div`
  position: relative;
  display: grid;
  grid-template-columns: 156px minmax(0, 1fr);
  gap: 4px 18px;
  align-items: baseline;
  padding: 12px 10px;
  border-radius: 8px;
  background: transparent;
  scroll-margin-top: var(--person-sticky-offset, 24px);
  transition:
    background-color 0.14s ease,
    box-shadow 0.2s ease;

  &[data-highlighted='true'] {
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.14)'
        : 'rgba(99, 102, 241, 0.08)'};
    box-shadow: inset 2px 0 0 #6366f1;
  }

  & + & {
    border-top: 1px solid
      ${({ theme }) =>
        theme.mode === 'dark'
          ? 'rgba(255,255,255,0.07)'
          : 'rgba(15, 23, 42, 0.075)'};
    border-radius: 0;
  }

  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255,255,255,0.025)'
        : 'rgba(15, 23, 42, 0.02)'};
  }
  &:hover ${OverviewActionGroup},
  &:focus-within ${OverviewActionGroup} {
    opacity: 1;
  }

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
    gap: 3px;
    padding: 11px 8px;
  }
`

const OverviewDateCol = styled.div<{
  $ongoing?: boolean
  $muted?: boolean
}>`
  font-size: 12.5px;
  font-weight: ${({ $ongoing, $muted }) =>
    $ongoing ? 700 : $muted ? 500 : 600};
  font-variant-numeric: tabular-nums;
  line-height: 1.45;
  word-break: keep-all;
  color: ${({ theme, $ongoing, $muted }) =>
    $ongoing
      ? theme.mode === 'dark'
        ? '#a5b4fc'
        : '#4338ca'
      : $muted
        ? theme.colors.text.tertiary
        : theme.colors.text.secondary};
`

const OverviewMainCol = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
`

const OverviewActionBtn = styled.button<{ $danger?: boolean }>`
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition:
    color 0.15s ease,
    background 0.15s ease;
  &:hover:not(:disabled) {
    color: ${({ $danger }) => ($danger ? '#e11d48' : '#4f46e5')};
    background: ${({ $danger }) =>
      $danger ? 'rgba(244, 63, 94, 0.1)' : 'rgba(99, 102, 241, 0.1)'};
  }
  &:disabled {
    opacity: 0.4;
    cursor: default;
  }
`

const OverviewHeader = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px 8px;
  padding-right: 56px;
`

const OverviewTitle = styled.span`
  font-size: 14.5px;
  font-weight: 700;
  letter-spacing: -0.015em;
  color: ${({ theme }) => theme.colors.text.primary};
  line-height: 1.35;
`

const OverviewRoleBadge = styled.span<{ $accent?: boolean }>`
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme, $accent }) =>
    $accent
      ? theme.mode === 'dark'
        ? '#c7d2fe'
        : '#4338ca'
      : theme.colors.text.secondary};
  padding: 2px 7px;
  border-radius: 5px;
  line-height: 1.3;
  background: ${({ theme, $accent }) =>
    $accent
      ? theme.mode === 'dark'
        ? 'rgba(99, 102, 241, 0.16)'
        : 'rgba(99, 102, 241, 0.08)'
      : theme.mode === 'dark'
        ? 'rgba(255,255,255,0.06)'
        : 'rgba(15, 23, 42, 0.05)'};
  border: 1px solid
    ${({ theme, $accent }) =>
      $accent
        ? theme.mode === 'dark'
          ? 'rgba(99, 102, 241, 0.28)'
          : 'rgba(99, 102, 241, 0.18)'
        : theme.mode === 'dark'
          ? 'rgba(255,255,255,0.08)'
          : 'rgba(15, 23, 42, 0.07)'};
`

const OverviewMeta = styled.div`
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-variant-numeric: tabular-nums;
  line-height: 1.45;
`

const OverviewNotes = styled.p`
  margin: 2px 0 0;
  max-width: 68ch;
  font-size: 13px;
  line-height: 1.65;
  color: ${({ theme }) => theme.colors.text.secondary};
  white-space: pre-wrap;
`

const ModalDateError = styled.p`
  margin: 6px 0 0;
  font-size: 12.5px;
  font-weight: 500;
  color: #e11d48;
`
