/**
 * 인물 상세 — 정당 소속 + 선거 후보 이력(상세 API에서 로드)
 * 당원 소속 추가·수정: 인물 등록 모달과 동일 셸(PoliticalPartyRegisterViewModal)
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  FiCalendar,
  FiChevronDown,
  FiEdit2,
  FiFlag,
  FiPlus,
  FiTrash2,
  FiX,
} from 'react-icons/fi'
import { useMemo, useState } from 'react'
import styled from 'styled-components'
import { toast } from 'react-hot-toast'

import {
  createPartyMembership,
  deletePartyMembership,
  getPoliticalParties,
  updatePartyMembership,
  type PartyMembershipLeadershipTier,
  type PartyMembershipRoleCategory,
  type PartyMembershipRow,
} from '@/shared/api/election'
import { useClickSound } from '@/shared/hooks/use-click-sound.hook'
import { DatePickerModal } from '@/shared/ui/date-picker/date-picker-modal'
import {
  PersonRegisterModalCancelBtn,
  PersonRegisterModalFormActions,
  PersonRegisterModalPrimaryBtn,
} from '@/shared/ui/person-register-modal/person-register-modal-shell'
import {
  DateFieldBtn,
  DateFieldsRow,
  FieldControl,
  FieldLabel,
  FieldRow,
  FormRows,
  FormSectionInner,
  Input,
  Textarea,
} from '@/shared/ui/register-form-layout'
import { PoliticalPartyRegisterViewModal } from '@/widgets/country/country-list/ui/political-party-register-view-modal'
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
  try {
    return new Date(`${ymd}T12:00:00.000Z`).toLocaleDateString('ko-KR')
  } catch {
    return ymd
  }
}

const PARTY_MEMBERSHIP_ROLE_OPTIONS: {
  value: PartyMembershipRoleCategory
  label: string
}[] = [
  { value: 'GENERAL_MEMBER', label: '일반 당원' },
  { value: 'LEADERSHIP', label: '지도부' },
  { value: 'PARLIAMENTARY', label: '국회·의회 당직' },
  { value: 'LOCAL_ORGANIZATION', label: '지역 조직' },
  { value: 'WING_ORGAN', label: '산하기구·계파' },
  { value: 'POLICY_STAFF', label: '정책·당직·사무' },
  { value: 'HONORARY', label: '고문·자문' },
  { value: 'OTHER', label: '기타' },
]

const PARTY_MEMBERSHIP_LEADERSHIP_TIER_OPTIONS: {
  value: PartyMembershipLeadershipTier
  label: string
}[] = [
  { value: 'TOP', label: '최상위 (대표·당대표 등)' },
  { value: 'SECOND', label: '2인자 (원내대표 등)' },
  { value: 'SENIOR', label: '상급 지도부' },
  { value: 'ORDINARY', label: '일반 지도부' },
  { value: 'JUNIOR', label: '하급·보좌' },
  { value: 'UNSPECIFIED', label: '미지정' },
]

function labelPartyMembershipRoleCategory(
  value: PartyMembershipRoleCategory | null | undefined,
): string {
  if (value == null) return '—'
  const found = PARTY_MEMBERSHIP_ROLE_OPTIONS.find((item) => item.value === value)
  return found?.label ?? String(value)
}

function labelPartyMembershipLeadershipTier(
  value: PartyMembershipLeadershipTier | null | undefined,
): string {
  if (value == null) return '—'
  const found = PARTY_MEMBERSHIP_LEADERSHIP_TIER_OPTIONS.find(
    (item) => item.value === value,
  )
  return found?.label ?? String(value)
}

type Props = {
  personId: string
  countryId?: string | null
  partyMemberships: PartyMembershipRow[] | undefined
  electionCandidacies: ElectionCandidacyDetail[] | undefined
  /** 개요에 섞일 때 구분선·여백. 탭 전용이면 상단 구분선 제거 */
  variant?: 'standalone' | 'tab'
}

export function PersonPoliticsSection({
  personId,
  countryId,
  partyMemberships: membershipsProp,
  electionCandidacies: candidaciesProp,
  variant = 'standalone',
}: Props) {
  const queryClient = useQueryClient()
  const playClickSound = useClickSound()
  const [panelOpen, setPanelOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [startDateModalOpen, setStartDateModalOpen] = useState(false)
  const [endDateModalOpen, setEndDateModalOpen] = useState(false)
  const [editPartyId, setEditPartyId] = useState('')
  const [editRoleCategory, setEditRoleCategory] =
    useState<PartyMembershipRoleCategory>('OTHER')
  const [editLeadershipTier, setEditLeadershipTier] =
    useState<PartyMembershipLeadershipTier>('UNSPECIFIED')
  const [editStart, setEditStart] = useState('')
  const [editEnd, setEditEnd] = useState('')
  const [editRole, setEditRole] = useState('')
  const [editNotes, setEditNotes] = useState('')

  const isMembershipModalOpen = panelOpen || editingId !== null

  const { data: parties = [] } = useQuery({
    queryKey: ['political-parties', countryId ?? 'all'],
    queryFn: () =>
      getPoliticalParties(countryId ? { countryId } : undefined),
    /** 탭에 있을 때는 폼·편집 전에도 목록을 미리 불러 두어 선택 지연을 줄임 */
    enabled: variant === 'tab' || isMembershipModalOpen,
  })

  const memberships = membershipsProp ?? []

  const invalidatePerson = () => {
    queryClient.invalidateQueries({ queryKey: ['person-detail', personId] })
  }

  const createMut = useMutation({
    mutationFn: () =>
      createPartyMembership(personId, {
        partyId: editPartyId,
        startDate: editStart || null,
        endDate: editEnd || null,
        roleCategory: editRoleCategory,
        leadershipTier:
          editRoleCategory === 'LEADERSHIP' ? editLeadershipTier : null,
        roleTitle: editRole.trim() || null,
        notes: editNotes.trim() || null,
      }),
    onSuccess: () => {
      toast.success('저장했습니다.')
      setPanelOpen(false)
      setEditingId(null)
      resetForm()
      invalidatePerson()
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : String(e))
    },
  })

  const updateMut = useMutation({
    mutationFn: () =>
      updatePartyMembership(personId, editingId!, {
        partyId: editPartyId,
        startDate: editStart || null,
        endDate: editEnd || null,
        roleCategory: editRoleCategory,
        leadershipTier:
          editRoleCategory === 'LEADERSHIP' ? editLeadershipTier : null,
        roleTitle: editRole.trim() || null,
        notes: editNotes.trim() || null,
      }),
    onSuccess: () => {
      toast.success('저장했습니다.')
      setPanelOpen(false)
      setEditingId(null)
      resetForm()
      invalidatePerson()
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : String(e))
    },
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => deletePartyMembership(personId, id),
    onSuccess: () => {
      toast.success('삭제했습니다.')
      invalidatePerson()
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : String(e))
    },
  })

  const resetForm = () => {
    setEditPartyId('')
    setEditRoleCategory('OTHER')
    setEditLeadershipTier('UNSPECIFIED')
    setEditStart('')
    setEditEnd('')
    setEditRole('')
    setEditNotes('')
  }

  const startEdit = (row: PartyMembershipRow) => {
    setPanelOpen(false)
    setEditingId(row.id)
    setEditPartyId(row.partyId)
    setEditRoleCategory(
      (row.roleCategory as PartyMembershipRoleCategory | undefined) ?? 'OTHER',
    )
    setEditLeadershipTier(
      (row.leadershipTier as PartyMembershipLeadershipTier | undefined) ??
        'UNSPECIFIED',
    )
    setEditStart(row.startDate?.slice(0, 10) ?? '')
    setEditEnd(row.endDate?.slice(0, 10) ?? '')
    setEditRole(row.roleTitle ?? '')
    setEditNotes(row.notes ?? '')
  }

  const openCreateModal = () => {
    setEditingId(null)
    resetForm()
    setPanelOpen(true)
  }

  const closeMembershipModal = () => {
    setPanelOpen(false)
    setEditingId(null)
    resetForm()
  }

  const candidacies = candidaciesProp ?? []

  const candidacySummary = useMemo(() => {
    return candidacies.map((candidacy) => ({
      ...candidacy,
      pollLabel: candidacy.election?.pollDate
        ? new Date(candidacy.election.pollDate).toLocaleDateString('ko-KR')
        : '—',
    }))
  }, [candidacies])

  return (
    <Root $variant={variant}>
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
        {!isMembershipModalOpen ? (
          <HeaderBtn type="button" onClick={openCreateModal}>
            <FiPlus size={17} strokeWidth={2.5} />
            당원 소속 추가
          </HeaderBtn>
        ) : null}
      </HeaderRow>

      <PoliticalPartyRegisterViewModal
        isOpen={isMembershipModalOpen}
        onClose={closeMembershipModal}
        title={editingId ? '당원 소속 수정' : '당원 소속 추가'}
        description="① 역할 분류로 직책 유형을, ② 지도부면 위계를 고르고, ③ 직함·세부에는 정당·국가마다 다른 실제 직책명·공식 표기를 직접 적습니다. 정당 목록은 국가 상세에서 먼저 등록할 수 있습니다."
      >
        <FormSectionInner>
          <FormRows>
            <FieldRow>
              <FieldLabel>정당</FieldLabel>
              <FullWidthFieldControl>
                <ModalSelect
                  value={editPartyId}
                  onChange={(event) => setEditPartyId(event.target.value)}
                >
                  <option value="">선택</option>
                  {parties.map((party) => (
                    <option key={party.id} value={party.id}>
                      {party.shortName
                        ? `${party.name} (${party.shortName})`
                        : party.name}
                    </option>
                  ))}
                </ModalSelect>
                {!countryId ? (
                  <ModalHint>
                    국가가 없으면 정당 목록이 많을 수 있습니다. 필요 시 국가를
                    먼저 연결하세요.
                  </ModalHint>
                ) : null}
              </FullWidthFieldControl>
            </FieldRow>
            <FieldRow>
              <FieldLabel>역할 분류</FieldLabel>
              <ModalFieldMedium>
                <ModalSelect
                  value={editRoleCategory}
                  onChange={(event) => {
                    const next = event.target.value as PartyMembershipRoleCategory
                    setEditRoleCategory(next)
                    if (next !== 'LEADERSHIP') setEditLeadershipTier('UNSPECIFIED')
                  }}
                >
                  {PARTY_MEMBERSHIP_ROLE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </ModalSelect>
                <ModalHint style={{ marginTop: 8 }}>
                  예: 청년위원장은 「산하기구」, 국회 원내대표는 「국회·의회 당직」 등
                </ModalHint>
              </ModalFieldMedium>
            </FieldRow>
            {editRoleCategory === 'LEADERSHIP' ? (
              <FieldRow>
                <FieldLabel>지도부 위계</FieldLabel>
                <ModalFieldMedium>
                  <ModalSelect
                    value={editLeadershipTier}
                    onChange={(event) =>
                      setEditLeadershipTier(
                        event.target.value as PartyMembershipLeadershipTier,
                      )
                    }
                  >
                    {PARTY_MEMBERSHIP_LEADERSHIP_TIER_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </ModalSelect>
                  <ModalHint style={{ marginTop: 8 }}>
                    같은 「지도부」 안에서 상대적 순위를 구분합니다. 직함은 아래
                    「직함·세부」에 적습니다.
                  </ModalHint>
                </ModalFieldMedium>
              </FieldRow>
            ) : null}
            <FieldRow>
              <FieldLabel>소속 기간</FieldLabel>
              <FieldControl $variant="datePair">
                <DateFieldsRow style={{ maxWidth: '100%' }}>
                  <SelectClearRow>
                    <DateFieldBtn
                      type="button"
                      $hasValue={!!editStart}
                      onClick={() => {
                        playClickSound()
                        setStartDateModalOpen(true)
                      }}
                    >
                      <FiCalendar size={16} />
                      <span>
                        {editStart ? formatYmdKo(editStart) : '시작일 (달력)'}
                      </span>
                      <FiChevronDown size={20} />
                    </DateFieldBtn>
                    {editStart ? (
                      <ClearFieldBtn
                        type="button"
                        onClick={() => {
                          playClickSound()
                          setEditStart('')
                        }}
                        aria-label="시작일 지우기"
                      >
                        <FiX size={16} />
                      </ClearFieldBtn>
                    ) : null}
                  </SelectClearRow>
                  <SelectClearRow>
                    <DateFieldBtn
                      type="button"
                      $hasValue={!!editEnd}
                      onClick={() => {
                        playClickSound()
                        setEndDateModalOpen(true)
                      }}
                    >
                      <FiCalendar size={16} />
                      <span>
                        {editEnd ? formatYmdKo(editEnd) : '종료일 (달력)'}
                      </span>
                      <FiChevronDown size={20} />
                    </DateFieldBtn>
                    {editEnd ? (
                      <ClearFieldBtn
                        type="button"
                        onClick={() => {
                          playClickSound()
                          setEditEnd('')
                        }}
                        aria-label="종료일 지우기"
                      >
                        <FiX size={16} />
                      </ClearFieldBtn>
                    ) : null}
                  </SelectClearRow>
                </DateFieldsRow>
              </FieldControl>
            </FieldRow>
            <FieldRow>
              <FieldLabel>직함·세부 (선택)</FieldLabel>
              <ModalFieldMedium>
                <Input
                  value={editRole}
                  onChange={(event) => setEditRole(event.target.value)}
                  placeholder="예: 청년위원장, 원내대표 (정당·국가별 실제 호칭)"
                />
                <ModalHint style={{ marginTop: 8 }}>
                  ①②로 유형·위계를 맞춘 뒤, 여기에는 해당 조직의 공식 직책명을
                  적습니다.
                </ModalHint>
              </ModalFieldMedium>
            </FieldRow>
            <FieldRow>
              <FieldLabel>메모</FieldLabel>
              <FullWidthFieldControl>
                <Textarea
                  rows={3}
                  value={editNotes}
                  onChange={(event) => setEditNotes(event.target.value)}
                />
              </FullWidthFieldControl>
            </FieldRow>
          </FormRows>
          <PersonRegisterModalFormActions>
            <PersonRegisterModalCancelBtn
              type="button"
              onClick={closeMembershipModal}
            >
              취소
            </PersonRegisterModalCancelBtn>
            <PersonRegisterModalPrimaryBtn
              type="button"
              disabled={
                !editPartyId ||
                (editingId ? updateMut.isPending : createMut.isPending)
              }
              onClick={() =>
                editingId ? updateMut.mutate() : createMut.mutate()
              }
            >
              {editingId
                ? updateMut.isPending
                  ? '저장 중…'
                  : '저장'
                : createMut.isPending
                  ? '저장 중…'
                  : '저장'}
            </PersonRegisterModalPrimaryBtn>
          </PersonRegisterModalFormActions>
        </FormSectionInner>
        <DatePickerModal
          isOpen={startDateModalOpen}
          onClose={() => setStartDateModalOpen(false)}
          onSelect={(date) => {
            setEditStart(date)
            setStartDateModalOpen(false)
          }}
          initialDate={editStart}
          title="소속 시작일"
        />
        <DatePickerModal
          isOpen={endDateModalOpen}
          onClose={() => setEndDateModalOpen(false)}
          onSelect={(date) => {
            setEditEnd(date)
            setEndDateModalOpen(false)
          }}
          initialDate={editEnd}
          title="소속 종료일"
        />
      </PoliticalPartyRegisterViewModal>

      <SubTitle>당원·소속 이력</SubTitle>
      {memberships.length === 0 ? (
        <Empty>등록된 당원 소속이 없습니다.</Empty>
      ) : (
        <Table>
          <thead>
            <tr>
              <th>정당</th>
              <th>역할 분류</th>
              <th>지도부 위계</th>
              <th>기간</th>
              <th>직함·세부</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {memberships.map((membershipRow) => (
              <tr key={membershipRow.id}>
                <td>{membershipRow.party?.name ?? membershipRow.partyId}</td>
                <td>
                  {labelPartyMembershipRoleCategory(
                    membershipRow.roleCategory as PartyMembershipRoleCategory | null,
                  )}
                </td>
                <td>
                  {membershipRow.roleCategory === 'LEADERSHIP'
                    ? labelPartyMembershipLeadershipTier(
                        (membershipRow.leadershipTier as
                          | PartyMembershipLeadershipTier
                          | null) ?? 'UNSPECIFIED',
                      )
                    : '—'}
                </td>
                <td>
                  {membershipRow.startDate?.slice(0, 10) ?? '—'} ~{' '}
                  {membershipRow.endDate?.slice(0, 10) ?? '현재'}
                </td>
                <td>{membershipRow.roleTitle ?? '—'}</td>
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
                    onClick={() => {
                      if (window.confirm('이 소속 기록을 삭제할까요?')) {
                        deleteMut.mutate(membershipRow.id)
                      }
                    }}
                  >
                    <FiTrash2 size={14} />
                  </IconBtn>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      <SubTitle style={{ marginTop: 22 }}>선거 후보 이력</SubTitle>
      {candidacySummary.length === 0 ? (
        <Empty>
          후보로 등록된 선거가 없습니다. 선거(선거관리)에서 후보를 추가하면
          표시됩니다.
        </Empty>
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
    </Root>
  )
}

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

const Root = styled.section<{ $variant: 'standalone' | 'tab' }>`
  margin-top: ${({ $variant }) => ($variant === 'tab' ? '0' : '4px')};
  padding-top: ${({ $variant }) => ($variant === 'tab' ? '0' : '22px')};
  border-top: ${({ $variant, theme }) =>
    $variant === 'tab'
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

const Empty = styled.p`
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const Table = styled.table`
  width: 100%;
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
  th {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: ${({ theme }) => theme.colors.text.tertiary};
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
  background: rgba(13, 148, 136, 0.15);
  color: #0f766e;
`
