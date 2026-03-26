import React, { useCallback, useEffect, useMemo, useState } from 'react'

import { createPortal } from 'react-dom'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import {
  FiBarChart2,
  FiCalendar,
  FiCheck,
  FiChevronDown,
  FiEdit2,
  FiPlus,
  FiTrash2,
  FiX,
} from 'react-icons/fi'
import { toast } from 'react-hot-toast'
import styled, { useTheme } from 'styled-components'

import { useCountry } from '@/entities/country/api'
import { usePersons } from '@/entities/person/api'
import type { PersonResponseDto } from '@/shared/api/persons'
import {
  createBallotOption,
  createElection,
  createElectionCandidacy,
  deleteBallotOption,
  deleteElection,
  deleteElectionCandidacy,
  ELECTION_STATUS_OPTIONS,
  ELECTION_TYPE_OPTIONS,
  type ElectionBallotOptionDto,
  type ElectionCandidacyDto,
  type ElectionDetailDto,
  type ElectionPartyResultDto,
  deleteElectionPartyResult,
  getElection,
  getElections,
  getElectoralDistricts,
  getPoliticalParties,
  type PoliticalPartyRow,
  labelElectionStatus,
  labelElectionType,
  labelNominationType,
  NOMINATION_TYPE_OPTIONS,
  updateBallotOption,
  updateElection,
  updateElectionCandidacy,
  upsertBallotOptionResult,
  upsertCandidacyResult,
  upsertElectionPartyResult,
} from '@/shared/api/election'
import { useClickSound } from '@/shared/hooks/use-click-sound.hook'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
import { FormSelectNative } from '@/shared/ui/form-select-native'
import { PersonSelectField } from '@/shared/ui/form-fields/person-select-field'
import { DatePickerModal } from '@/shared/ui/date-picker/date-picker-modal'
import {
  CheckboxRow,
  DateFieldBtn,
  FieldControl,
  FieldLabel,
  FieldRow,
  FormRows,
  Input,
  Required,
  Textarea,
} from '@/shared/ui/register-form-layout'
import {
  PersonRegisterModalBox,
  PersonRegisterModalCancelBtn,
  PersonRegisterModalCloseBtn,
  PersonRegisterModalFormActions,
  PersonRegisterModalFormScroll,
  PersonRegisterModalHeader,
  PersonRegisterModalOverlay,
  PersonRegisterModalPrimaryBtn,
  PersonRegisterModalTitle,
} from '@/shared/ui/person-register-modal/person-register-modal-shell'

import { CountryPoliticalPartiesBlock } from './country-political-parties-block.widget'
import {
  BallotAddRow,
  DataTable,
  DataTableCard,
  DataTd,
  DataTh,
  DataTr,
  DetailColumn,
  DetailDescription,
  DetailMeta,
  DetailHeaderIconBtn,
  DetailTitle,
  DetailToolbar,
  ElectedBadge,
  ElectionListScrollArea,
  EmptyHint,
  InlineTextInput,
  ListColumn,
  PoliticsTabPanel,
  SectionHeaderRow,
  SectionKicker,
  SectionLead,
  SplitMainRow,
  SubsectionLabel,
  ElectionListStack,
  ElectionNavButton,
  ElectionNavMeta,
  ElectionNavTitle,
  PartyShareDonutClip,
  PartyShareDonutHole,
  PartyShareDonutInner,
  PartyShareDonutLayout,
  PartyShareDonutRing,
  PartyShareInfographic,
  PartyShareInfographicTitle,
  PartyShareLegend,
  PartyShareLegendBody,
  PartyShareLegendItem,
  PartyShareName,
  PartyShareStats,
  PartyShareSwatch,
  PoliticsOnboardingSteps,
  PoliticsTabSubsection,
  RowActions,
  RowIconBtn,
  SubsectionAddBtn,
  SubsectionHeaderBlock,
  SubsectionHeading,
  SubsectionLead,
} from './country-politics-tab.styles'

const qk = {
  list: (scopeKey: string) => ['elections', 'list', scopeKey] as const,
  detail: (id: string) => ['elections', 'detail', id] as const,
  parties: (scopeKey: string) => ['political-parties', scopeKey] as const,
  districts: (scopeKey: string) => ['electoral-districts', scopeKey] as const,
}

function electionScopeKey(input: {
  countryId?: string
  historicalCountryId?: string
}) {
  if (input.historicalCountryId)
    return `h:${input.historicalCountryId}` as const
  if (input.countryId) return `c:${input.countryId}` as const
  return '' as const
}

function electionListParams(input: {
  countryId?: string
  historicalCountryId?: string
}):
  | { countryId: string }
  | { historicalCountryId: string }
  | Record<string, never> {
  if (input.historicalCountryId)
    return { historicalCountryId: input.historicalCountryId }
  if (input.countryId) return { countryId: input.countryId }
  return {}
}

function electionScopeBody(input: {
  countryId?: string
  historicalCountryId?: string
}): { countryId: string | null; historicalCountryId: string | null } {
  if (input.historicalCountryId) {
    return { countryId: null, historicalCountryId: input.historicalCountryId }
  }
  return {
    countryId: input.countryId ?? null,
    historicalCountryId: null,
  }
}

const FullWidthControl = styled(FieldControl)`
  max-width: 100% !important;
  width: 100%;
`

/** API 날짜 → 달력용 YYYY-MM-DD (로컬 날짜 기준) */
function toLocalDateYmd(value: string | null | undefined): string {
  if (value == null || value === '') return ''
  const s = String(value).trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) {
    try {
      const d = new Date(s)
      if (Number.isNaN(d.getTime())) return s.slice(0, 10)
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${y}-${m}-${day}`
    } catch {
      return s.slice(0, 10)
    }
  }
  try {
    const d = new Date(s)
    if (Number.isNaN(d.getTime())) return ''
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  } catch {
    return ''
  }
}

/** 투표율 표시·입력: 소수 첫째 자리까지 */
function formatPercentOneDecimalForInput(v: string | number | null | undefined): string {
  const n = Number(v)
  if (!Number.isFinite(n)) return ''
  return String(Math.round(n * 10) / 10)
}

/** 0~100, 소수 첫째 자리만 입력 허용 (문자 필터) */
function sanitizePercentInput(raw: string): string {
  let t = raw.replace(/[^\d.]/g, '')
  if (t === '') return ''
  const dot = t.indexOf('.')
  if (dot === -1) {
    return t.length > 6 ? t.slice(0, 6) : t
  }
  const intPart = t.slice(0, dot).replace(/\D/g, '')
  const after = t.slice(dot + 1).replace(/\D/g, '')
  const frac = after.slice(0, 1)
  if (frac === '') return intPart === '' ? '0.' : `${intPart}.`
  return `${intPart}.${frac}`
}

/** 0 이상 정수: 숫자만 */
function sanitizeNonNegativeIntInput(raw: string): string {
  return raw.replace(/\D/g, '')
}

/** 득표수: 숫자만, 선행 0 제거(단독 0은 유지) */
function sanitizeVoteCountInput(raw: string): string {
  const d = raw.replace(/\D/g, '')
  if (d === '') return ''
  return d.replace(/^0+/, '') || '0'
}

const ModalFieldWide = styled(FieldControl)`
  max-width: min(560px, 100%) !important;
`

const ModalFieldMedium = styled(FieldControl)`
  max-width: min(400px, 100%) !important;
`

const ModalFieldNarrow = styled(FieldControl)`
  max-width: 280px !important;
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

function formatPollYmdKo(ymd: string) {
  if (!ymd) return ''
  try {
    return new Date(`${ymd}T12:00:00.000Z`).toLocaleDateString('ko-KR')
  } catch {
    return ymd
  }
}

function ElectionsModalShell({
  title,
  onClose,
  children,
  maxWidth = 'min(1000px, 96vw)',
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
  maxWidth?: string
}) {
  return createPortal(
    <PersonRegisterModalOverlay
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <PersonRegisterModalBox
        $maxWidth={maxWidth}
        $minHeight="auto"
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
      >
        <PersonRegisterModalHeader>
          <PersonRegisterModalTitle>{title}</PersonRegisterModalTitle>
          <PersonRegisterModalCloseBtn type="button" onClick={onClose} aria-label="닫기">
            <FiX size={20} />
          </PersonRegisterModalCloseBtn>
        </PersonRegisterModalHeader>
        <PersonRegisterModalFormScroll>{children}</PersonRegisterModalFormScroll>
      </PersonRegisterModalBox>
    </PersonRegisterModalOverlay>,
    document.body,
  )
}

function formatPollDate(iso: string) {
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return iso
  }
}

/** 빈 값이면 null, 0 이상 정수면 해당 값, 그 외는 invalid */
function parseOptionalNonNegativeInt(
  raw: string,
): number | null | 'invalid' {
  const t = raw.trim()
  if (t === '') return null
  const n = Number(t)
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) return 'invalid'
  return n
}

/** 득표율·투표 참여율: 빈 값 null, 0~100·소수 첫째 자리까지, 그 외 invalid */
function parseOptionalPercent0to100(raw: string): number | null | 'invalid' {
  const t = raw.trim().replace(/\.$/, '')
  if (t === '') return null
  if (!/^\d+(\.\d)?$/.test(t)) return 'invalid'
  const n = Number(t)
  if (!Number.isFinite(n) || n < 0 || n > 100) return 'invalid'
  return Math.round(n * 10) / 10
}

/** 득표수(문자열): 비우면 null, 숫자만 허용 */
function parseOptionalVotesDigits(raw: string): string | null | 'invalid' {
  const t = raw.trim().replace(/[\s,]/g, '')
  if (t === '') return null
  if (!/^\d+$/.test(t)) return 'invalid'
  return t
}

/** API·폼에서 온 득표율을 표시용 문자열로 (Decimal 직렬화 이슈 대비) */
function formatVoteShareLabel(v: string | number | null | undefined): string | null {
  if (v == null || v === '') return null
  const s = String(v).trim()
  if (s === '' || s === '[object Object]') return null
  const n = Number(s)
  if (Number.isFinite(n)) {
    const rounded = Math.round(n * 100) / 100
    return `${rounded}%`
  }
  return s.endsWith('%') ? s : `${s}%`
}

function hueFromPartyId(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h + id.charCodeAt(i) * (i + 1)) % 72
  return 208 + h
}

/**
 * 정당 브랜드 색(#RRGGBB) 우선.
 * 선거 상세의 중첩 `party`에 색이 없을 때 이 국가 정당 목록(`parties`)에서 보강.
 */
function partyResultSliceFill(
  row: ElectionPartyResultDto,
  fallbackHue: number,
  registryBrandColor?: string | null,
): string {
  const raw = (row.party?.brandColor ?? registryBrandColor)?.trim()
  if (raw) {
    const withHash = raw.startsWith('#') ? raw : `#${raw}`
    if (/^#[0-9A-Fa-f]{6}$/.test(withHash)) return withHash
  }
  return `hsl(${fallbackHue} 68% 54%)`
}

export interface CountryElectionsSectionProps {
  /** 현대 국가 상세에서 전달 */
  countryId?: string
  /** 역사 국가 상세에서 전달 — `countryId`와 동시에 쓰지 않음 */
  historicalCountryId?: string
}

export function CountryElectionsSection({
  countryId,
  historicalCountryId,
}: CountryElectionsSectionProps) {
  const { partyId: electionPartyId } = useParams<{ partyId?: string }>()
  const queryClient = useQueryClient()
  const { data: persons = [] } = usePersons()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const scopeKey = useMemo(
    () => electionScopeKey({ countryId, historicalCountryId }),
    [countryId, historicalCountryId],
  )
  const listParams = useMemo(
    () => electionListParams({ countryId, historicalCountryId }),
    [countryId, historicalCountryId],
  )
  const electionScope = useMemo(
    () => ({ countryId, historicalCountryId }),
    [countryId, historicalCountryId],
  )

  const [electionModal, setElectionModal] = useState<
    | { mode: 'create' }
    | { mode: 'edit'; election: ElectionDetailDto }
    | null
  >(null)
  const [candidacyModal, setCandidacyModal] = useState<
    | { mode: 'create'; electionId: string }
    | { mode: 'edit'; electionId: string; row: ElectionCandidacyDto }
    | null
  >(null)
  const [resultModal, setResultModal] = useState<{
    electionId: string
    candidacyId: string
    initial?: ElectionCandidacyDto['result']
  } | null>(null)
  const [ballotResultModal, setBallotResultModal] = useState<{
    electionId: string
    option: ElectionBallotOptionDto
  } | null>(null)
  const [partyResultModal, setPartyResultModal] = useState<
    | { mode: 'create'; electionId: string }
    | { mode: 'edit'; electionId: string; row: ElectionPartyResultDto }
    | null
  >(null)

  const { data: list = [], isLoading: listLoading } = useQuery({
    queryKey: qk.list(scopeKey),
    queryFn: () => getElections(listParams as Record<string, string>),
    enabled: !!scopeKey,
  })

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: qk.detail(selectedId ?? ''),
    queryFn: () => getElection(selectedId!),
    enabled: !!selectedId,
  })

  const { data: parties = [] } = useQuery({
    queryKey: qk.parties(scopeKey),
    queryFn: () => getPoliticalParties(listParams as Record<string, string>),
    enabled: !!scopeKey,
  })

  const { data: districts = [] } = useQuery({
    queryKey: qk.districts(scopeKey),
    queryFn: () => getElectoralDistricts(listParams as Record<string, string>),
    enabled: !!scopeKey,
  })

  const { data: countryForNames } = useCountry(countryId ?? '')

  const candidacyLabel = useCallback(
    (c: ElectionCandidacyDto) => {
      if (c.person) {
        const p = c.person as {
          name: string
          surname?: string | null
          middleName?: string | null
          country?: { defaultNameDisplayOrder?: string | null } | null
        }
        return getPersonDisplayName(
          {
            name: p.name,
            surname: p.surname,
            middleName: p.middleName,
            country: p.country ?? null,
          },
          {
            countryDefaultNameDisplayOrder:
              countryForNames?.defaultNameDisplayOrder ?? null,
          },
        )
      }
      if (c.party) return c.party.shortName || c.party.name
      return '(후보 정보 없음)'
    },
    [countryForNames?.defaultNameDisplayOrder],
  )

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: qk.list(scopeKey) })
    if (selectedId)
      queryClient.invalidateQueries({ queryKey: qk.detail(selectedId) })
  }, [queryClient, scopeKey, selectedId])

  const saveElectionMut = useMutation({
    mutationFn: async (payload: {
      mode: 'create' | 'edit'
      id?: string
      body: Parameters<typeof createElection>[0] | Parameters<typeof updateElection>[1]
    }) => {
      if (payload.mode === 'create')
        return createElection(payload.body as Parameters<typeof createElection>[0])
      return updateElection(payload.id!, payload.body as Parameters<typeof updateElection>[1])
    },
    onSuccess: (row) => {
      invalidate()
      setSelectedId(row.id)
      setElectionModal(null)
      toast.success('저장되었습니다.')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const delElectionMut = useMutation({
    mutationFn: (id: string) => deleteElection(id),
    onSuccess: () => {
      invalidate()
      setSelectedId(null)
      toast.success('삭제되었습니다.')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const saveCandidacyMut = useMutation({
    mutationFn: async (p: {
      mode: 'create' | 'edit'
      electionId: string
      candidacyId?: string
      body: Parameters<typeof createElectionCandidacy>[1]
    }) => {
      if (p.mode === 'create')
        return createElectionCandidacy(p.electionId, p.body)
      return updateElectionCandidacy(p.electionId, p.candidacyId!, p.body)
    },
    onSuccess: () => {
      invalidate()
      setCandidacyModal(null)
      toast.success('후보가 저장되었습니다.')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const delCandidacyMut = useMutation({
    mutationFn: (p: { electionId: string; candidacyId: string }) =>
      deleteElectionCandidacy(p.electionId, p.candidacyId),
    onSuccess: () => {
      invalidate()
      toast.success('후보 행이 삭제되었습니다.')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const resultMut = useMutation({
    mutationFn: (p: {
      electionId: string
      candidacyId: string
      body: Parameters<typeof upsertCandidacyResult>[2]
    }) => upsertCandidacyResult(p.electionId, p.candidacyId, p.body),
    onSuccess: () => {
      invalidate()
      setResultModal(null)
      toast.success('득표가 반영되었습니다.')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const ballotCreateMut = useMutation({
    mutationFn: (p: { electionId: string; label: string; sortOrder: number }) =>
      createBallotOption(p.electionId, {
        label: p.label,
        sortOrder: p.sortOrder,
      }),
    onSuccess: () => {
      invalidate()
      toast.success('투표 안이 추가되었습니다.')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const ballotRenameMut = useMutation({
    mutationFn: (p: {
      electionId: string
      optionId: string
      label: string
    }) => updateBallotOption(p.electionId, p.optionId, { label: p.label }),
    onSuccess: () => {
      invalidate()
      toast.success('투표 안 이름이 저장되었습니다.')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const ballotDelMut = useMutation({
    mutationFn: (p: { electionId: string; optionId: string }) =>
      deleteBallotOption(p.electionId, p.optionId),
    onSuccess: () => {
      invalidate()
      toast.success('삭제되었습니다.')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const ballotResultMut = useMutation({
    mutationFn: (p: {
      electionId: string
      optionId: string
      body: Parameters<typeof upsertBallotOptionResult>[2]
    }) => upsertBallotOptionResult(p.electionId, p.optionId, p.body),
    onSuccess: () => {
      invalidate()
      setBallotResultModal(null)
      toast.success('집계가 반영되었습니다.')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const partyResultMut = useMutation({
    mutationFn: (p: {
      electionId: string
      partyId: string
      body: Parameters<typeof upsertElectionPartyResult>[2]
    }) => upsertElectionPartyResult(p.electionId, p.partyId, p.body),
    onSuccess: () => {
      invalidate()
      setPartyResultModal(null)
      toast.success('정당 집계가 저장되었습니다.')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const partyResultDelMut = useMutation({
    mutationFn: (p: { electionId: string; partyId: string }) =>
      deleteElectionPartyResult(p.electionId, p.partyId),
    onSuccess: () => {
      invalidate()
      toast.success('정당 집계를 삭제했습니다.')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const sortedList = useMemo(
    () =>
      [...list].sort(
        (a, b) =>
          new Date(b.pollDate).getTime() - new Date(a.pollDate).getTime(),
      ),
    [list],
  )

  return (
    <PoliticsTabPanel>
      <SectionHeaderRow>
        <div>
          <SectionKicker>선거·투표</SectionKicker>
          <SectionLead>
            {historicalCountryId
              ? '역사 국가 맥락의 정당·선거를 등록합니다. 후보 편집에서 정당을 선택할 수 있습니다.'
              : '아래에서 이 국가 소속 정당을 등록한 뒤, 선거·후보 편집에서 정당을 선택할 수 있습니다. 선거구는 API로만 등록 중이면 별도 도구를 사용하세요.'}
          </SectionLead>
        </div>
        <SubsectionAddBtn type="button" onClick={() => setElectionModal({ mode: 'create' })}>
          <FiPlus size={15} strokeWidth={2.25} />
          새 선거
        </SubsectionAddBtn>
      </SectionHeaderRow>

      <CountryPoliticalPartiesBlock
        countryId={countryId}
        historicalCountryId={historicalCountryId}
        selectedPartyId={electionPartyId ?? null}
      />

      {!electionPartyId ? (
      <PoliticsTabSubsection aria-label="선거 목록·상세">
        <SubsectionHeaderBlock>
          <SubsectionHeading>선거</SubsectionHeading>
          <SubsectionLead>
            왼쪽 목록에서 선거를 고르면 우측에 상세·후보·득표 편집이 열립니다.
          </SubsectionLead>
        </SubsectionHeaderBlock>
      <SplitMainRow>
        <ListColumn>
          <ElectionListScrollArea>
          {listLoading ? (
            <EmptyHint>목록 불러오는 중…</EmptyHint>
          ) : sortedList.length === 0 ? (
            <>
              <EmptyHint style={{ marginBottom: 12 }}>
                등록된 선거가 없습니다.
              </EmptyHint>
              <PoliticsOnboardingSteps>
                <li>상단의 「새 선거」로 선거 일정·유형을 등록합니다.</li>
                <li>후보·득표·투표안은 선거를 선택한 뒤 우측 패널에서 편집합니다.</li>
                <li>후보에 연결할 정당은 위의 정당 목록에서 먼저 등록해 두세요.</li>
              </PoliticsOnboardingSteps>
            </>
          ) : (
            <ElectionListStack>
              {sortedList.map((e) => (
                <ElectionNavButton
                  key={e.id}
                  type="button"
                  $active={selectedId === e.id}
                  onClick={() => setSelectedId(e.id)}
                >
                  <ElectionNavTitle>{e.name}</ElectionNavTitle>
                  <ElectionNavMeta>
                    {formatPollDate(e.pollDate)} · {labelElectionType(e.electionType)}
                    {e.status ? ` · ${labelElectionStatus(e.status)}` : ''}
                  </ElectionNavMeta>
                </ElectionNavButton>
              ))}
            </ElectionListStack>
          )}
          </ElectionListScrollArea>
        </ListColumn>

        <DetailColumn>
          {!selectedId ? (
            <EmptyHint style={{ fontSize: 14 }}>
              목록에서 선거를 선택하세요.
            </EmptyHint>
          ) : detailLoading || !detail ? (
            <EmptyHint>상세 불러오는 중…</EmptyHint>
          ) : (
            <ElectionDetailPanel
              detail={detail}
              parties={parties}
              onAddPartyResult={() =>
                setPartyResultModal({ mode: 'create', electionId: detail.id })
              }
              onEditPartyResult={(row) =>
                setPartyResultModal({
                  mode: 'edit',
                  electionId: detail.id,
                  row,
                })
              }
              onDeletePartyResult={(row) => {
                if (
                  window.confirm(
                    `「${row.party?.shortName || row.party?.name || '정당'}」집계를 삭제할까요?`,
                  )
                )
                  partyResultDelMut.mutate({
                    electionId: detail.id,
                    partyId: row.partyId,
                  })
              }}
              onEditElection={() => setElectionModal({ mode: 'edit', election: detail })}
              onDeleteElection={() => {
                if (
                  window.confirm(
                    `"${detail.name}" 선거를 삭제할까요? 후보·득표 데이터도 함께 삭제됩니다.`,
                  )
                )
                  delElectionMut.mutate(detail.id)
              }}
              onAddCandidacy={() =>
                setCandidacyModal({ mode: 'create', electionId: detail.id })
              }
              onEditCandidacy={(row) =>
                setCandidacyModal({
                  mode: 'edit',
                  electionId: detail.id,
                  row,
                })
              }
              onDeleteCandidacy={(row) => {
                if (window.confirm('이 후보 행을 삭제할까요?'))
                  delCandidacyMut.mutate({
                    electionId: detail.id,
                    candidacyId: row.id,
                  })
              }}
              onEditResult={(row) =>
                setResultModal({
                  electionId: detail.id,
                  candidacyId: row.id,
                  initial: row.result ?? undefined,
                })
              }
              onAddBallotOption={(label, sortOrder) =>
                ballotCreateMut.mutate({
                  electionId: detail.id,
                  label,
                  sortOrder,
                })
              }
              onRenameBallotOption={async (optionId, label) => {
                await ballotRenameMut.mutateAsync({
                  electionId: detail.id,
                  optionId,
                  label,
                })
              }}
              onDeleteBallotOption={(opt) => {
                if (window.confirm(`「${opt.label}」안을 삭제할까요?`))
                  ballotDelMut.mutate({ electionId: detail.id, optionId: opt.id })
              }}
              onEditBallotResult={(opt) =>
                setBallotResultModal({ electionId: detail.id, option: opt })
              }
            />
          )}
        </DetailColumn>
      </SplitMainRow>
      </PoliticsTabSubsection>
      ) : null}

      {electionModal && (
        <ElectionFormModal
          key={
            electionModal.mode === 'edit'
              ? `election-${electionModal.election.id}`
              : 'election-new'
          }
          electionScope={electionScope}
          mode={electionModal.mode}
          initial={electionModal.mode === 'edit' ? electionModal.election : undefined}
          saving={saveElectionMut.isPending}
          onClose={() => setElectionModal(null)}
          onSubmit={(payload) => {
            if (payload.mode === 'create')
              saveElectionMut.mutate({ mode: 'create', body: payload.body })
            else
              saveElectionMut.mutate({
                mode: 'edit',
                id: payload.id,
                body: payload.body,
              })
          }}
        />
      )}

      {candidacyModal && (
        <CandidacyFormModal
          key={
            candidacyModal.mode === 'create'
              ? `candidacy-new-${candidacyModal.electionId}`
              : `candidacy-${candidacyModal.row.id}`
          }
          persons={persons}
          parties={parties}
          districts={districts}
          mode={candidacyModal.mode}
          initial={candidacyModal.mode === 'edit' ? candidacyModal.row : undefined}
          electionId={candidacyModal.electionId}
          saving={saveCandidacyMut.isPending}
          onClose={() => setCandidacyModal(null)}
          onSubmit={(payload) => {
            if (payload.mode === 'create')
              saveCandidacyMut.mutate({
                mode: 'create',
                electionId: payload.electionId,
                body: payload.body,
              })
            else
              saveCandidacyMut.mutate({
                mode: 'edit',
                electionId: payload.electionId,
                candidacyId: payload.candidacyId,
                body: payload.body,
              })
          }}
        />
      )}

      {resultModal && (
        <ResultFormModal
          key={`result-${resultModal.electionId}-${resultModal.candidacyId}`}
          saving={resultMut.isPending}
          initial={resultModal.initial}
          onClose={() => setResultModal(null)}
          onSubmit={(body) =>
            resultMut.mutate({
              electionId: resultModal.electionId,
              candidacyId: resultModal.candidacyId,
              body,
            })
          }
        />
      )}

      {ballotResultModal && (
        <BallotResultFormModal
          key={`ballot-result-${ballotResultModal.electionId}-${ballotResultModal.option.id}`}
          saving={ballotResultMut.isPending}
          option={ballotResultModal.option}
          onClose={() => setBallotResultModal(null)}
          onSubmit={(body) =>
            ballotResultMut.mutate({
              electionId: ballotResultModal.electionId,
              optionId: ballotResultModal.option.id,
              body,
            })
          }
        />
      )}

      {partyResultModal && (
        <PartyResultFormModal
          key={
            partyResultModal.mode === 'create'
              ? `party-result-new-${partyResultModal.electionId}`
              : `party-result-${partyResultModal.electionId}-${partyResultModal.row.partyId}`
          }
          mode={partyResultModal.mode}
          parties={parties}
          existingPartyIds={
            detail?.partyResults?.map((row) => row.partyId) ?? []
          }
          initialRow={
            partyResultModal.mode === 'edit' ? partyResultModal.row : undefined
          }
          saving={partyResultMut.isPending}
          onClose={() => setPartyResultModal(null)}
          onSubmit={(partyId, body) =>
            partyResultMut.mutate({
              electionId: partyResultModal.electionId,
              partyId,
              body,
            })
          }
        />
      )}
    </PoliticsTabPanel>
  )
}

function ElectionDetailPanel({
  detail,
  parties,
  onAddPartyResult,
  onEditPartyResult,
  onDeletePartyResult,
  onEditElection,
  onDeleteElection,
  onAddCandidacy,
  onEditCandidacy,
  onDeleteCandidacy,
  onEditResult,
  onAddBallotOption,
  onRenameBallotOption,
  onDeleteBallotOption,
  onEditBallotResult,
}: {
  detail: ElectionDetailDto
  parties: PoliticalPartyRow[]
  onAddPartyResult: () => void
  onEditPartyResult: (row: ElectionPartyResultDto) => void
  onDeletePartyResult: (row: ElectionPartyResultDto) => void
  onEditElection: () => void
  onDeleteElection: () => void
  onAddCandidacy: () => void
  onEditCandidacy: (row: ElectionCandidacyDto) => void
  onDeleteCandidacy: (row: ElectionCandidacyDto) => void
  onEditResult: (row: ElectionCandidacyDto) => void
  onAddBallotOption: (label: string, sortOrder: number) => void
  onRenameBallotOption: (optionId: string, label: string) => Promise<void>
  onDeleteBallotOption: (opt: ElectionBallotOptionDto) => void
  onEditBallotResult: (opt: ElectionBallotOptionDto) => void
}) {
  const isReferendum = detail.electionType === 'REFERENDUM_OR_PLEBISCITE'
  const [ballotLabel, setBallotLabel] = useState('')
  const [editingBallotId, setEditingBallotId] = useState<string | null>(null)
  const [editingBallotLabel, setEditingBallotLabel] = useState('')

  const sortedBallotOptions = useMemo(
    () =>
      [...(detail.ballotOptions ?? [])].sort((a, b) => a.sortOrder - b.sortOrder),
    [detail.ballotOptions],
  )

  const partyResults = detail.partyResults ?? []
  const theme = useTheme()

  const partyShareChart = useMemo(() => {
    const rows = [...partyResults]
    const sorted = [...rows].sort((a, b) => {
      const na = Number(a.voteSharePercent)
      const nb = Number(b.voteSharePercent)
      if (Number.isFinite(na) && Number.isFinite(nb)) return nb - na
      return 0
    })
    return { sorted }
  }, [partyResults])

  const partyPieSlices = useMemo(() => {
    const sorted = partyShareChart.sorted
    if (sorted.length === 0) {
      return {
        gradient: 'transparent' as const,
        segments: [] as Array<{
          row: ElectionPartyResultDto
          startDeg: number
          endDeg: number
          hue: number
          fill: string
          fraction: number
        }>,
        ariaLabel: '',
      }
    }
    const weights = sorted.map((row) => {
      const p = Number(row.voteSharePercent)
      if (Number.isFinite(p) && p >= 0) return p
      try {
        const vs = row.votes != null ? String(row.votes).trim() : ''
        if (vs && /^\d+$/.test(vs)) return Number(BigInt(vs))
      } catch {
        /* */
      }
      return 0
    })
    const sumW = weights.reduce((a, b) => a + b, 0)
    const n = sorted.length
    const fractions =
      sumW > 0
        ? weights.map((w) => w / sumW)
        : n > 0
          ? Array(n).fill(1 / n)
          : []

    let acc = 0
    const segments = sorted.map((row, i) => {
      const frac = fractions[i] ?? 0
      const startDeg = acc * 180
      acc += frac
      const endDeg = i === sorted.length - 1 ? 180 : acc * 180
      const hue = hueFromPartyId(row.partyId)
      const registryColor = parties.find((p) => p.id === row.partyId)
        ?.brandColor
      return {
        row,
        startDeg,
        endDeg,
        hue,
        fill: partyResultSliceFill(row, hue, registryColor),
        fraction: frac,
      }
    })

    /** 상단 반원(9시→12시→3시)에만 득표 비중 표시, 하단 180°는 배경색으로 메움 */
    const bottomFill = theme.colors.background.primary
    const gradient =
      segments.length > 0
        ? `conic-gradient(from 270deg, ${segments
            .map((s) => `${s.fill} ${s.startDeg}deg ${s.endDeg}deg`)
            .join(', ')}, ${bottomFill} 180deg 360deg)`
        : 'transparent'

    const ariaLabel = segments
      .map((s) => {
        const name = s.row.party?.shortName || s.row.party?.name || '정당'
        const pct = formatVoteShareLabel(s.row.voteSharePercent)
        if (pct) return `${name} ${pct}`
        return `${name} ${(s.fraction * 100).toFixed(1)}%`
      })
      .join(', ')

    return { gradient, segments, ariaLabel }
  }, [partyShareChart.sorted, parties, theme.colors.background.primary])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <SectionHeaderRow style={{ alignItems: 'flex-start' }}>
        <div>
          <DetailTitle>{detail.name}</DetailTitle>
          <DetailMeta>
            {labelElectionType(detail.electionType)} ·{' '}
            {labelElectionStatus(detail.status)} · {formatPollDate(detail.pollDate)}
          </DetailMeta>
          {detail.legislatureTermStart || detail.legislatureTermEnd ? (
            <DetailMeta style={{ marginTop: 6 }}>
              의회 임기:{' '}
              {detail.legislatureTermStart
                ? formatPollDate(detail.legislatureTermStart)
                : '—'}
              {' — '}
              {detail.legislatureTermEnd
                ? formatPollDate(detail.legislatureTermEnd)
                : '—'}
            </DetailMeta>
          ) : null}
          {(detail.voterTurnoutPercent != null &&
            String(detail.voterTurnoutPercent).trim() !== '') ||
          detail.totalSeats != null ? (
            <DetailMeta style={{ marginTop: 6 }}>
              {[
                detail.voterTurnoutPercent != null &&
                String(detail.voterTurnoutPercent).trim() !== ''
                  ? `투표율(참여): ${detail.voterTurnoutPercent}%`
                  : null,
                detail.totalSeats != null
                  ? `총 의석: ${detail.totalSeats}석`
                  : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </DetailMeta>
          ) : null}
          {detail.description ? (
            <DetailDescription>{detail.description}</DetailDescription>
          ) : null}
        </div>
        <DetailToolbar>
          <DetailHeaderIconBtn
            type="button"
            onClick={onEditElection}
            aria-label="선거 수정"
            title="선거 수정"
          >
            <FiEdit2 size={17} strokeWidth={2} />
          </DetailHeaderIconBtn>
          <DetailHeaderIconBtn
            type="button"
            $variant="danger"
            onClick={onDeleteElection}
            aria-label="선거 삭제"
            title="선거 삭제"
          >
            <FiTrash2 size={17} strokeWidth={2} />
          </DetailHeaderIconBtn>
        </DetailToolbar>
      </SectionHeaderRow>

      <div>
        <SectionHeaderRow style={{ marginBottom: 10 }}>
          <SubsectionLabel>정당별 집계 (전국·비례 등)</SubsectionLabel>
          <SubsectionAddBtn type="button" onClick={onAddPartyResult}>
            <FiPlus size={14} strokeWidth={2.25} />
            집계 추가
          </SubsectionAddBtn>
        </SectionHeaderRow>
        {partyResults.length > 0 ? (
          <PartyShareInfographic>
            <PartyShareInfographicTitle>득표율 분포</PartyShareInfographicTitle>
            <PartyShareDonutLayout>
              <PartyShareDonutClip>
                <PartyShareDonutInner>
                  <PartyShareDonutRing
                    $gradient={partyPieSlices.gradient}
                    role="img"
                    aria-label={
                      partyPieSlices.ariaLabel
                        ? `상단 반원 기준 득표 비율: ${partyPieSlices.ariaLabel}`
                        : '득표 분포'
                    }
                  />
                  <PartyShareDonutHole aria-hidden />
                </PartyShareDonutInner>
              </PartyShareDonutClip>
              <PartyShareLegend>
                {partyPieSlices.segments.map((s) => {
                  const label =
                    s.row.party?.shortName ||
                    s.row.party?.name ||
                    s.row.partyId
                  const pct = formatVoteShareLabel(s.row.voteSharePercent)
                  const votesStr =
                    s.row.votes != null && String(s.row.votes).trim() !== ''
                      ? String(s.row.votes)
                      : null
                  const shareLine =
                    pct ??
                    (s.fraction > 0
                      ? `${(s.fraction * 100).toFixed(1)}% (비중)`
                      : '득표율 —')
                  const detail = [
                    votesStr ? `${votesStr}표` : null,
                    s.row.seatsWon != null ? `${s.row.seatsWon}석` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')
                  return (
                    <PartyShareLegendItem key={s.row.id}>
                      <PartyShareSwatch $fill={s.fill} aria-hidden />
                      <PartyShareLegendBody>
                        <PartyShareName>{label}</PartyShareName>
                        <PartyShareStats>
                          {shareLine}
                          {detail ? ` · ${detail}` : ''}
                        </PartyShareStats>
                      </PartyShareLegendBody>
                    </PartyShareLegendItem>
                  )
                })}
              </PartyShareLegend>
            </PartyShareDonutLayout>
          </PartyShareInfographic>
        ) : null}
        <DataTableCard>
          <DataTable>
            <thead>
              <tr>
                <DataTh>정당</DataTh>
                <DataTh>득표</DataTh>
                <DataTh>득표율</DataTh>
                <DataTh>의석</DataTh>
                <DataTh style={{ width: 72, textAlign: 'right' }} />
              </tr>
            </thead>
            <tbody>
              {partyResults.length === 0 ? (
                <DataTr>
                  <DataTd colSpan={5}>
                    <EmptyHint>
                      등록된 정당 집계가 없습니다. 후보 행과 별도로 전국 합계만 넣을 때
                      사용합니다.
                    </EmptyHint>
                  </DataTd>
                </DataTr>
              ) : (
                partyResults.map((row) => (
                  <DataTr key={row.id}>
                    <DataTd>
                      {row.party
                        ? row.party.shortName || row.party.name
                        : row.partyId}
                    </DataTd>
                    <DataTd>{row.votes ?? '—'}</DataTd>
                    <DataTd>
                      {formatVoteShareLabel(row.voteSharePercent) ?? '—'}
                    </DataTd>
                    <DataTd>{row.seatsWon ?? '—'}</DataTd>
                    <DataTd style={{ textAlign: 'right' }}>
                      <RowActions>
                        <RowIconBtn
                          type="button"
                          onClick={() => onEditPartyResult(row)}
                          aria-label="수정"
                          title="수정"
                        >
                          <FiEdit2 size={15} strokeWidth={2} />
                        </RowIconBtn>
                        <RowIconBtn
                          type="button"
                          $variant="danger"
                          onClick={() => onDeletePartyResult(row)}
                          aria-label="삭제"
                          title="삭제"
                        >
                          <FiTrash2 size={15} strokeWidth={2} />
                        </RowIconBtn>
                      </RowActions>
                    </DataTd>
                  </DataTr>
                ))
              )}
            </tbody>
          </DataTable>
        </DataTableCard>
      </div>

      {isReferendum ? (
        <div>
          <BallotAddRow>
            <SubsectionLabel>투표 안 (선택지)</SubsectionLabel>
            <InlineTextInput
              type="text"
              value={ballotLabel}
              onChange={(e) => setBallotLabel(e.target.value)}
              placeholder="안 제목 (예: 찬성)"
            />
            <SubsectionAddBtn
              type="button"
              onClick={() => {
                const t = ballotLabel.trim()
                if (!t) {
                  toast.error('안 제목을 입력하세요.')
                  return
                }
                const nextSortOrder =
                  sortedBallotOptions.length === 0
                    ? 0
                    : Math.max(
                        ...sortedBallotOptions.map((option) => option.sortOrder),
                      ) + 1
                onAddBallotOption(t, nextSortOrder)
                setBallotLabel('')
              }}
            >
              <FiPlus size={14} strokeWidth={2.25} />
              추가
            </SubsectionAddBtn>
          </BallotAddRow>
          <DataTableCard>
            <DataTable>
              <thead>
                <tr>
                  <DataTh>안</DataTh>
                  <DataTh>득표</DataTh>
                  <DataTh>득표율</DataTh>
                  <DataTh style={{ width: 96, textAlign: 'right' }} />
                </tr>
              </thead>
              <tbody>
                {sortedBallotOptions.length === 0 ? (
                  <DataTr>
                    <DataTd colSpan={4}>
                      <EmptyHint>등록된 투표 안이 없습니다.</EmptyHint>
                    </DataTd>
                  </DataTr>
                ) : (
                  sortedBallotOptions.map((opt) => (
                    <DataTr key={opt.id}>
                      <DataTd>
                        {editingBallotId === opt.id ? (
                          <div
                            style={{
                              display: 'flex',
                              flexWrap: 'wrap',
                              gap: 8,
                              alignItems: 'center',
                            }}
                          >
                            <InlineTextInput
                              type="text"
                              value={editingBallotLabel}
                              onChange={(e) => setEditingBallotLabel(e.target.value)}
                              style={{ minWidth: 140, flex: '1 1 160px' }}
                            />
                            <RowIconBtn
                              type="button"
                              onClick={async () => {
                                const nextLabel = editingBallotLabel.trim()
                                if (!nextLabel) {
                                  toast.error('안 제목을 입력하세요.')
                                  return
                                }
                                try {
                                  await onRenameBallotOption(opt.id, nextLabel)
                                  setEditingBallotId(null)
                                } catch {
                                  /* mutation onError 토스트 */
                                }
                              }}
                              aria-label="이름 저장"
                              title="저장"
                            >
                              <FiCheck size={17} strokeWidth={2.25} />
                            </RowIconBtn>
                            <RowIconBtn
                              type="button"
                              onClick={() => setEditingBallotId(null)}
                              aria-label="취소"
                              title="취소"
                            >
                              <FiX size={17} strokeWidth={2.25} />
                            </RowIconBtn>
                          </div>
                        ) : (
                          <span>{opt.label}</span>
                        )}
                      </DataTd>
                      <DataTd>{opt.result?.votes ?? '—'}</DataTd>
                      <DataTd>
                        {formatVoteShareLabel(opt.result?.voteSharePercent) ?? '—'}
                      </DataTd>
                      <DataTd style={{ textAlign: 'right' }}>
                        {editingBallotId !== opt.id ? (
                          <RowActions>
                            <RowIconBtn
                              type="button"
                              onClick={() => {
                                setEditingBallotId(opt.id)
                                setEditingBallotLabel(opt.label)
                              }}
                              aria-label={`「${opt.label}」이름 편집`}
                              title="이름 편집"
                            >
                              <FiEdit2 size={15} strokeWidth={2} />
                            </RowIconBtn>
                            <RowIconBtn
                              type="button"
                              onClick={() => onEditBallotResult(opt)}
                              aria-label="집계 편집"
                              title="집계"
                            >
                              <FiBarChart2 size={15} strokeWidth={2} />
                            </RowIconBtn>
                            <RowIconBtn
                              type="button"
                              $variant="danger"
                              onClick={() => onDeleteBallotOption(opt)}
                              aria-label="안 삭제"
                              title="삭제"
                            >
                              <FiTrash2 size={15} strokeWidth={2} />
                            </RowIconBtn>
                          </RowActions>
                        ) : null}
                      </DataTd>
                    </DataTr>
                  ))
                )}
              </tbody>
            </DataTable>
          </DataTableCard>
        </div>
      ) : (
        <div>
          <SectionHeaderRow style={{ marginBottom: 10 }}>
            <SubsectionLabel>후보</SubsectionLabel>
            <SubsectionAddBtn type="button" onClick={onAddCandidacy}>
              <FiPlus size={14} strokeWidth={2.25} />
              후보 추가
            </SubsectionAddBtn>
          </SectionHeaderRow>
          <DataTableCard>
            <DataTable>
              <thead>
                <tr>
                  <DataTh>후보·정당</DataTh>
                  <DataTh>선거구</DataTh>
                  <DataTh>지명</DataTh>
                  <DataTh>득표</DataTh>
                  <DataTh>득표율</DataTh>
                  <DataTh>순위</DataTh>
                  <DataTh>의석</DataTh>
                  <DataTh style={{ width: 104, textAlign: 'right' }} />
                </tr>
              </thead>
              <tbody>
                {detail.candidacies.length === 0 ? (
                  <DataTr>
                    <DataTd colSpan={8}>
                      <EmptyHint>후보가 없습니다.</EmptyHint>
                    </DataTd>
                  </DataTr>
                ) : (
                  detail.candidacies.map((c) => (
                    <DataTr key={c.id}>
                      <DataTd>
                        <div style={{ fontWeight: 600 }}>{candidacyLabel(c)}</div>
                        {c.party ? (
                          <div style={{ fontSize: 11, opacity: 0.85 }}>
                            {c.party.shortName || c.party.name}
                          </div>
                        ) : null}
                      </DataTd>
                      <DataTd>
                        {c.electoralDistrict
                          ? c.electoralDistrict.code
                            ? `${c.electoralDistrict.name} (${c.electoralDistrict.code})`
                            : c.electoralDistrict.name
                          : '—'}
                      </DataTd>
                      <DataTd>{labelNominationType(c.nominationType)}</DataTd>
                      <DataTd>
                        {c.result?.votes ?? '—'}
                        {c.result?.elected ? <ElectedBadge>당선</ElectedBadge> : null}
                      </DataTd>
                      <DataTd>
                        {formatVoteShareLabel(c.result?.voteSharePercent) ?? '—'}
                      </DataTd>
                      <DataTd>
                        {c.result?.resultRank != null ? c.result.resultRank : '—'}
                      </DataTd>
                      <DataTd>
                        {c.result?.seatsWon != null ? c.result.seatsWon : '—'}
                      </DataTd>
                      <DataTd style={{ textAlign: 'right' }}>
                        <RowActions>
                          <RowIconBtn
                            type="button"
                            onClick={() => onEditResult(c)}
                            aria-label="득표·결과"
                            title="득표·결과"
                          >
                            <FiBarChart2 size={15} strokeWidth={2} />
                          </RowIconBtn>
                          <RowIconBtn
                            type="button"
                            onClick={() => onEditCandidacy(c)}
                            aria-label="후보 수정"
                            title="수정"
                          >
                            <FiEdit2 size={15} strokeWidth={2} />
                          </RowIconBtn>
                          <RowIconBtn
                            type="button"
                            $variant="danger"
                            onClick={() => onDeleteCandidacy(c)}
                            aria-label="후보 삭제"
                            title="삭제"
                          >
                            <FiTrash2 size={15} strokeWidth={2} />
                          </RowIconBtn>
                        </RowActions>
                      </DataTd>
                    </DataTr>
                  ))
                )}
              </tbody>
            </DataTable>
          </DataTableCard>
        </div>
      )}
    </div>
  )
}

function ElectionFormModal({
  electionScope,
  mode,
  initial,
  saving,
  onClose,
  onSubmit,
}: {
  electionScope: { countryId?: string; historicalCountryId?: string }
  mode: 'create' | 'edit'
  initial?: ElectionDetailDto
  saving: boolean
  onClose: () => void
  onSubmit: (p: {
    mode: 'create' | 'edit'
    id?: string
    body: Parameters<typeof createElection>[0] | Parameters<typeof updateElection>[1]
  }) => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [shortName, setShortName] = useState(initial?.shortName ?? '')
  const [electionType, setElectionType] = useState(
    initial?.electionType ?? 'PARLIAMENTARY_CONSTITUENCY',
  )
  const [status, setStatus] = useState(initial?.status ?? 'SCHEDULED')
  const [pollDate, setPollDate] = useState(
    initial?.pollDate
      ? toLocalDateYmd(initial.pollDate) ||
        new Date().toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10),
  )
  const [description, setDescription] = useState(initial?.description ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [legTermStart, setLegTermStart] = useState(() =>
    toLocalDateYmd(initial?.legislatureTermStart),
  )
  const [legTermEnd, setLegTermEnd] = useState(() =>
    toLocalDateYmd(initial?.legislatureTermEnd),
  )
  const playClickSound = useClickSound()
  const [pollModalOpen, setPollModalOpen] = useState(false)
  const [termStartModalOpen, setTermStartModalOpen] = useState(false)
  const [termEndModalOpen, setTermEndModalOpen] = useState(false)
  const [voterTurnout, setVoterTurnout] = useState(
    initial?.voterTurnoutPercent != null &&
      String(initial.voterTurnoutPercent).trim() !== ''
      ? formatPercentOneDecimalForInput(initial.voterTurnoutPercent)
      : '',
  )
  const [totalSeatsStr, setTotalSeatsStr] = useState(
    initial?.totalSeats != null ? String(initial.totalSeats) : '',
  )

  useEffect(() => {
    if (mode !== 'edit' || !initial) return
    setName(initial.name ?? '')
    setShortName(initial.shortName ?? '')
    setElectionType(initial.electionType ?? 'PARLIAMENTARY_CONSTITUENCY')
    setStatus(initial.status ?? 'SCHEDULED')
    setPollDate(
      toLocalDateYmd(initial.pollDate) || new Date().toISOString().slice(0, 10),
    )
    setDescription(initial.description ?? '')
    setNotes(initial.notes ?? '')
    setLegTermStart(toLocalDateYmd(initial.legislatureTermStart))
    setLegTermEnd(toLocalDateYmd(initial.legislatureTermEnd))
    setVoterTurnout(
      initial.voterTurnoutPercent != null &&
        String(initial.voterTurnoutPercent).trim() !== ''
        ? formatPercentOneDecimalForInput(initial.voterTurnoutPercent)
        : '',
    )
    setTotalSeatsStr(initial.totalSeats != null ? String(initial.totalSeats) : '')
  }, [mode, initial])

  const title = mode === 'create' ? '새 선거' : '선거 수정'
  const scopeLabel = electionScope.historicalCountryId
    ? '역사 국가 맥락으로 저장됩니다.'
    : '현재 보고 있는 현대 국가에 연결되어 저장됩니다.'

  return (
    <>
      <ElectionsModalShell title={title} onClose={onClose}>
        <FormRows>
          <FieldRow>
            <FieldLabel>소속</FieldLabel>
            <FullWidthControl>
              <span
                style={{
                  fontSize: 13,
                  color: 'var(--text-secondary, #64748b)',
                  lineHeight: 1.45,
                }}
              >
                {scopeLabel}
              </span>
            </FullWidthControl>
          </FieldRow>
          <FieldRow>
            <FieldLabel htmlFor="election-form-name">
              명칭 <Required>*</Required>
            </FieldLabel>
            <ModalFieldWide>
              <Input
                id="election-form-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="off"
                aria-required
              />
            </ModalFieldWide>
          </FieldRow>
          <FieldRow>
            <FieldLabel>짧은 이름</FieldLabel>
            <ModalFieldMedium>
              <Input
                value={shortName}
                onChange={(event) => setShortName(event.target.value)}
              />
            </ModalFieldMedium>
          </FieldRow>
          <FieldRow>
            <FieldLabel>유형</FieldLabel>
            <ModalFieldNarrow>
              <FormSelectNative
                value={electionType}
                onChange={(event) => setElectionType(event.target.value)}
              >
                {ELECTION_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </FormSelectNative>
            </ModalFieldNarrow>
          </FieldRow>
          <FieldRow>
            <FieldLabel>상태</FieldLabel>
            <ModalFieldNarrow>
              <FormSelectNative
                value={status}
                onChange={(event) => setStatus(event.target.value)}
              >
                {ELECTION_STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </FormSelectNative>
            </ModalFieldNarrow>
          </FieldRow>
          <FieldRow>
            <FieldLabel>
              투표일 <Required>*</Required>
            </FieldLabel>
            <FieldControl $variant="datePair">
              <SelectClearRow style={{ maxWidth: '100%' }}>
                <DateFieldBtn
                  type="button"
                  $hasValue={!!pollDate}
                  onClick={() => {
                    playClickSound()
                    setPollModalOpen(true)
                  }}
                  aria-required
                >
                  <FiCalendar size={16} />
                  <span>
                    {pollDate ? formatPollYmdKo(pollDate) : '투표일 (달력)'}
                  </span>
                  <FiChevronDown size={20} />
                </DateFieldBtn>
                {pollDate ? (
                  <ClearFieldBtn
                    type="button"
                    onClick={() => {
                      playClickSound()
                      setPollDate('')
                    }}
                    aria-label="투표일 지우기"
                  >
                    <FiX size={16} />
                  </ClearFieldBtn>
                ) : null}
              </SelectClearRow>
            </FieldControl>
          </FieldRow>
          <FieldRow>
            <FieldLabel>의회 임기 시작</FieldLabel>
            <FieldControl $variant="datePair">
              <SelectClearRow style={{ maxWidth: '100%' }}>
                <DateFieldBtn
                  type="button"
                  $hasValue={!!legTermStart}
                  onClick={() => {
                    playClickSound()
                    setTermStartModalOpen(true)
                  }}
                >
                  <FiCalendar size={16} />
                  <span>
                    {legTermStart
                      ? formatPollYmdKo(legTermStart)
                      : '임기 시작일 (선택)'}
                  </span>
                  <FiChevronDown size={20} />
                </DateFieldBtn>
                {legTermStart ? (
                  <ClearFieldBtn
                    type="button"
                    onClick={() => {
                      playClickSound()
                      setLegTermStart('')
                    }}
                    aria-label="의회 임기 시작일 지우기"
                  >
                    <FiX size={16} />
                  </ClearFieldBtn>
                ) : null}
              </SelectClearRow>
            </FieldControl>
          </FieldRow>
          <FieldRow>
            <FieldLabel>의회 임기 종료</FieldLabel>
            <FieldControl $variant="datePair">
              <SelectClearRow style={{ maxWidth: '100%' }}>
                <DateFieldBtn
                  type="button"
                  $hasValue={!!legTermEnd}
                  onClick={() => {
                    playClickSound()
                    setTermEndModalOpen(true)
                  }}
                >
                  <FiCalendar size={16} />
                  <span>
                    {legTermEnd
                      ? formatPollYmdKo(legTermEnd)
                      : '임기 종료일 (선택)'}
                  </span>
                  <FiChevronDown size={20} />
                </DateFieldBtn>
                {legTermEnd ? (
                  <ClearFieldBtn
                    type="button"
                    onClick={() => {
                      playClickSound()
                      setLegTermEnd('')
                    }}
                    aria-label="의회 임기 종료일 지우기"
                  >
                    <FiX size={16} />
                  </ClearFieldBtn>
                ) : null}
              </SelectClearRow>
            </FieldControl>
          </FieldRow>
            <FieldRow>
              <FieldLabel>투표율(참여) %</FieldLabel>
              <ModalFieldNarrow>
                <Input
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  value={voterTurnout}
                  onChange={(event) =>
                    setVoterTurnout(sanitizePercentInput(event.target.value))
                  }
                  placeholder="0–100 · 소수 첫째 자리까지"
                />
              </ModalFieldNarrow>
            </FieldRow>
            <FieldRow>
              <FieldLabel>총 의석</FieldLabel>
              <ModalFieldNarrow>
                <Input
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  value={totalSeatsStr}
                  onChange={(event) =>
                    setTotalSeatsStr(sanitizeNonNegativeIntInput(event.target.value))
                  }
                  placeholder="0 이상 정수"
                />
              </ModalFieldNarrow>
            </FieldRow>
          <FieldRow>
            <FieldLabel>설명</FieldLabel>
            <FullWidthControl>
              <Textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={3}
              />
            </FullWidthControl>
          </FieldRow>
          <FieldRow>
            <FieldLabel>메모</FieldLabel>
            <FullWidthControl>
              <Textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={2}
              />
            </FullWidthControl>
          </FieldRow>
        </FormRows>
        <PersonRegisterModalFormActions>
          <PersonRegisterModalCancelBtn type="button" onClick={onClose}>
            취소
          </PersonRegisterModalCancelBtn>
          <PersonRegisterModalPrimaryBtn
            type="button"
            disabled={saving || !name.trim() || !pollDate}
            onClick={() => {
              const turnoutParsed = parseOptionalPercent0to100(voterTurnout)
              if (turnoutParsed === 'invalid') {
                toast.error(
                  '투표율(참여)은 0~100 사이 숫자(소수 첫째 자리까지)이거나 비워 두세요.',
                )
                return
              }
              const totalSeatsParsed = parseOptionalNonNegativeInt(totalSeatsStr)
              if (totalSeatsParsed === 'invalid') {
                toast.error('총 의석은 0 이상의 정수이거나 비워 두세요.')
                return
              }
              const iso = `${pollDate}T12:00:00.000Z`
              const termStartIso = legTermStart
                ? `${legTermStart}T12:00:00.000Z`
                : null
              const termEndIso = legTermEnd
                ? `${legTermEnd}T12:00:00.000Z`
                : null
              const turnoutBody =
                turnoutParsed === null ? null : String(turnoutParsed)
              const scopeFields = electionScopeBody(electionScope)
              if (mode === 'create') {
                onSubmit({
                  mode: 'create',
                  body: {
                    name: name.trim(),
                    shortName: shortName.trim() || null,
                    electionType,
                    status,
                    pollDate: iso,
                    ...scopeFields,
                    legislatureTermStart: termStartIso,
                    legislatureTermEnd: termEndIso,
                    voterTurnoutPercent: turnoutBody,
                    totalSeats: totalSeatsParsed,
                    description: description.trim() || null,
                    notes: notes.trim() || null,
                  },
                })
              } else {
                onSubmit({
                  mode: 'edit',
                  id: initial!.id,
                  body: {
                    name: name.trim(),
                    shortName: shortName.trim() || null,
                    electionType,
                    status,
                    pollDate: iso,
                    ...scopeFields,
                    legislatureTermStart: termStartIso,
                    legislatureTermEnd: termEndIso,
                    voterTurnoutPercent: turnoutBody,
                    totalSeats: totalSeatsParsed,
                    description: description.trim() || null,
                    notes: notes.trim() || null,
                  },
                })
              }
            }}
          >
            저장
          </PersonRegisterModalPrimaryBtn>
        </PersonRegisterModalFormActions>
      </ElectionsModalShell>
      <DatePickerModal
        isOpen={pollModalOpen}
        onClose={() => setPollModalOpen(false)}
        onSelect={(date) => {
          setPollDate(date)
          setPollModalOpen(false)
        }}
        initialDate={pollDate}
        title="투표일 선택"
      />
      <DatePickerModal
        isOpen={termStartModalOpen}
        onClose={() => setTermStartModalOpen(false)}
        onSelect={(date) => {
          setLegTermStart(date)
          setTermStartModalOpen(false)
        }}
        initialDate={legTermStart}
        title="의회 임기 시작일"
      />
      <DatePickerModal
        isOpen={termEndModalOpen}
        onClose={() => setTermEndModalOpen(false)}
        onSelect={(date) => {
          setLegTermEnd(date)
          setTermEndModalOpen(false)
        }}
        initialDate={legTermEnd}
        title="의회 임기 종료일"
      />
    </>
  )
}

function CandidacyFormModal({
  persons,
  parties,
  districts,
  mode,
  electionId,
  initial,
  saving,
  onClose,
  onSubmit,
}: {
  persons: PersonResponseDto[]
  parties: { id: string; name: string; shortName?: string | null }[]
  districts: { id: string; name: string; code?: string | null }[]
  mode: 'create' | 'edit'
  electionId: string
  initial?: ElectionCandidacyDto
  saving: boolean
  onClose: () => void
  onSubmit: (p: {
    mode: 'create' | 'edit'
    electionId: string
    candidacyId?: string
    body: Parameters<typeof createElectionCandidacy>[1]
  }) => void
}) {
  const [personId, setPersonId] = useState(initial?.personId ?? '')
  const [partyId, setPartyId] = useState(initial?.partyId ?? '')
  const [districtId, setDistrictId] = useState(initial?.electoralDistrictId ?? '')
  const [nominationType, setNominationType] = useState(
    initial?.nominationType ?? 'PARTY_NOMINATION',
  )
  const [ballotOrder, setBallotOrder] = useState(
    initial?.ballotOrder != null ? String(initial.ballotOrder) : '',
  )
  const [listRank, setListRank] = useState(
    initial?.listRank != null ? String(initial.listRank) : '',
  )
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [personModalOpen, setPersonModalOpen] = useState(false)

  const selectedPerson = useMemo(
    () => persons.find((p) => p.id === personId) ?? null,
    [persons, personId],
  )

  const title = mode === 'create' ? '후보 추가' : '후보 수정'

  return (
    <ElectionsModalShell title={title} onClose={onClose} maxWidth="min(1120px, 96vw)">
      <FormRows>
        <PersonSelectField
          label="인물 (선택)"
          value={personId}
          selectedPerson={selectedPerson}
          persons={persons}
          isModalOpen={personModalOpen}
          onModalOpenChange={setPersonModalOpen}
          onSelect={(id) => setPersonId(id)}
          hint="비례 정당 전용 행 등 인물이 없을 수 있습니다."
        />
        <FieldRow>
          <FieldLabel>정당</FieldLabel>
          <ModalFieldWide>
            <FormSelectNative value={partyId} onChange={(e) => setPartyId(e.target.value)}>
              <option value="">(없음)</option>
              {parties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.shortName || p.name}
                </option>
              ))}
            </FormSelectNative>
          </ModalFieldWide>
        </FieldRow>
        <FieldRow>
          <FieldLabel>선거구</FieldLabel>
          <ModalFieldWide>
            <FormSelectNative
              value={districtId}
              onChange={(e) => setDistrictId(e.target.value)}
            >
              <option value="">(없음)</option>
              {districts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.code ? `${d.name} (${d.code})` : d.name}
                </option>
              ))}
            </FormSelectNative>
          </ModalFieldWide>
        </FieldRow>
        <FieldRow>
          <FieldLabel>지명 방식</FieldLabel>
          <ModalFieldNarrow>
            <FormSelectNative
              value={nominationType}
              onChange={(e) => setNominationType(e.target.value)}
            >
              {NOMINATION_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </FormSelectNative>
          </ModalFieldNarrow>
        </FieldRow>
        <FieldRow>
          <FieldLabel>기표 순서</FieldLabel>
          <ModalFieldNarrow>
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              value={ballotOrder}
              onChange={(e) => setBallotOrder(e.target.value)}
              placeholder="0 이상 정수"
            />
          </ModalFieldNarrow>
        </FieldRow>
        <FieldRow>
          <FieldLabel>비례 순번</FieldLabel>
          <ModalFieldNarrow>
            <Input
              type="text"
              inputMode="numeric"
              value={listRank}
              onChange={(e) =>
                setListRank(sanitizeNonNegativeIntInput(e.target.value))
              }
              placeholder="0 이상 정수"
            />
          </ModalFieldNarrow>
        </FieldRow>
        <FieldRow>
          <FieldLabel>메모</FieldLabel>
          <ModalFieldWide>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={5} />
          </ModalFieldWide>
        </FieldRow>
      </FormRows>
      <PersonRegisterModalFormActions>
        <PersonRegisterModalCancelBtn type="button" onClick={onClose}>
          취소
        </PersonRegisterModalCancelBtn>
        <PersonRegisterModalPrimaryBtn
          type="button"
          disabled={saving}
          onClick={() => {
            const ballotOrderParsed = parseOptionalNonNegativeInt(ballotOrder)
            if (ballotOrderParsed === 'invalid') {
              toast.error('기표 순서는 0 이상의 정수이거나 비워 두세요.')
              return
            }
            const listRankParsed = parseOptionalNonNegativeInt(listRank)
            if (listRankParsed === 'invalid') {
              toast.error('비례 순번은 0 이상의 정수이거나 비워 두세요.')
              return
            }
            const body: Parameters<typeof createElectionCandidacy>[1] = {
              personId: personId || null,
              partyId: partyId || null,
              electoralDistrictId: districtId || null,
              nominationType,
              ballotOrder: ballotOrderParsed,
              listRank: listRankParsed,
              notes: notes.trim() || null,
            }
            if (mode === 'create') onSubmit({ mode: 'create', electionId, body })
            else
              onSubmit({
                mode: 'edit',
                electionId,
                candidacyId: initial!.id,
                body,
              })
          }}
        >
          저장
        </PersonRegisterModalPrimaryBtn>
      </PersonRegisterModalFormActions>
    </ElectionsModalShell>
  )
}

function ResultFormModal({
  initial,
  saving,
  onClose,
  onSubmit,
}: {
  initial?: ElectionCandidacyDto['result']
  saving: boolean
  onClose: () => void
  onSubmit: (body: Parameters<typeof upsertCandidacyResult>[2]) => void
}) {
  const [votes, setVotes] = useState(initial?.votes ?? '')
  const [pct, setPct] = useState(
    initial?.voteSharePercent != null && String(initial.voteSharePercent).trim() !== ''
      ? formatPercentOneDecimalForInput(initial.voteSharePercent)
      : '',
  )
  const [rank, setRank] = useState(
    initial?.resultRank != null ? String(initial.resultRank) : '',
  )
  const [seatsWon, setSeatsWon] = useState(
    initial?.seatsWon != null ? String(initial.seatsWon) : '',
  )
  const [elected, setElected] = useState(initial?.elected ?? false)
  const [notes, setNotes] = useState(initial?.notes ?? '')

  return (
    <ElectionsModalShell title="득표·결과" onClose={onClose}>
      <FormRows>
        <FieldRow>
          <FieldLabel>득표수</FieldLabel>
          <FullWidthControl>
            <Input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={votes}
              onChange={(e) =>
                setVotes(sanitizeVoteCountInput(e.target.value))
              }
            />
          </FullWidthControl>
        </FieldRow>
        <FieldRow>
          <FieldLabel>득표율 (%)</FieldLabel>
          <ModalFieldNarrow>
            <Input
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={pct}
              onChange={(e) =>
                setPct(sanitizePercentInput(e.target.value))
              }
              placeholder="0–100 · 소수 첫째 자리"
            />
          </ModalFieldNarrow>
        </FieldRow>
        <FieldRow>
          <FieldLabel>순위</FieldLabel>
          <FullWidthControl>
            <Input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={rank}
              onChange={(e) =>
                setRank(sanitizeNonNegativeIntInput(e.target.value))
              }
              placeholder="0 이상 정수 · 없으면 비움"
            />
          </FullWidthControl>
        </FieldRow>
        <FieldRow>
          <FieldLabel>의석 수</FieldLabel>
          <FullWidthControl>
            <Input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={seatsWon}
              onChange={(e) =>
                setSeatsWon(sanitizeNonNegativeIntInput(e.target.value))
              }
              placeholder="비례·다선거구 등 (없으면 비움)"
            />
          </FullWidthControl>
        </FieldRow>
        <CheckboxRow>
          <input
            type="checkbox"
            id="result-elected"
            checked={elected}
            onChange={(e) => setElected(e.target.checked)}
          />
          <label htmlFor="result-elected">당선 처리</label>
        </CheckboxRow>
        <FieldRow>
          <FieldLabel>메모</FieldLabel>
          <FullWidthControl>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </FullWidthControl>
        </FieldRow>
      </FormRows>
      <PersonRegisterModalFormActions>
        <PersonRegisterModalCancelBtn type="button" onClick={onClose}>
          취소
        </PersonRegisterModalCancelBtn>
        <PersonRegisterModalPrimaryBtn
          type="button"
          disabled={saving}
          onClick={() => {
            const votesParsed = parseOptionalVotesDigits(votes)
            if (votesParsed === 'invalid') {
              toast.error('득표수는 숫자만 입력하거나 비워 두세요.')
              return
            }
            const pctParsed = parseOptionalPercent0to100(pct)
            if (pctParsed === 'invalid') {
              toast.error(
                '득표율은 0~100 사이 숫자(소수 첫째 자리까지)이거나 비워 두세요.',
              )
              return
            }
            const rankParsed = parseOptionalNonNegativeInt(rank)
            if (rankParsed === 'invalid') {
              toast.error('순위는 0 이상의 정수이거나 비워 두세요.')
              return
            }
            const seatsParsed = parseOptionalNonNegativeInt(seatsWon)
            if (seatsParsed === 'invalid') {
              toast.error('의석 수는 0 이상의 정수이거나 비워 두세요.')
              return
            }
            onSubmit({
              votes: votesParsed,
              voteSharePercent:
                pctParsed === null ? null : String(pctParsed),
              resultRank: rankParsed,
              seatsWon: seatsParsed,
              elected,
              notes: notes.trim() || null,
            })
          }}
        >
          저장
        </PersonRegisterModalPrimaryBtn>
      </PersonRegisterModalFormActions>
    </ElectionsModalShell>
  )
}

function BallotResultFormModal({
  option,
  saving,
  onClose,
  onSubmit,
}: {
  option: ElectionBallotOptionDto
  saving: boolean
  onClose: () => void
  onSubmit: (body: Parameters<typeof upsertBallotOptionResult>[2]) => void
}) {
  const [votes, setVotes] = useState(option.result?.votes ?? '')
  const [pct, setPct] = useState(
    option.result?.voteSharePercent != null &&
      String(option.result.voteSharePercent).trim() !== ''
      ? formatPercentOneDecimalForInput(option.result.voteSharePercent)
      : '',
  )
  const [notes, setNotes] = useState(option.result?.notes ?? '')

  return (
    <ElectionsModalShell title={`「${option.label}」집계`} onClose={onClose}>
      <FormRows>
        <FieldRow>
          <FieldLabel>득표수</FieldLabel>
          <FullWidthControl>
            <Input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={votes}
              onChange={(e) =>
                setVotes(sanitizeVoteCountInput(e.target.value))
              }
            />
          </FullWidthControl>
        </FieldRow>
        <FieldRow>
          <FieldLabel>득표율 (%)</FieldLabel>
          <ModalFieldNarrow>
            <Input
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={pct}
              onChange={(e) =>
                setPct(sanitizePercentInput(e.target.value))
              }
              placeholder="0–100 · 소수 첫째 자리"
            />
          </ModalFieldNarrow>
        </FieldRow>
        <FieldRow>
          <FieldLabel>메모</FieldLabel>
          <FullWidthControl>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </FullWidthControl>
        </FieldRow>
      </FormRows>
      <PersonRegisterModalFormActions>
        <PersonRegisterModalCancelBtn type="button" onClick={onClose}>
          취소
        </PersonRegisterModalCancelBtn>
        <PersonRegisterModalPrimaryBtn
          type="button"
          disabled={saving}
          onClick={() => {
            const votesParsed = parseOptionalVotesDigits(votes)
            if (votesParsed === 'invalid') {
              toast.error('득표수는 숫자만 입력하거나 비워 두세요.')
              return
            }
            const pctParsed = parseOptionalPercent0to100(pct)
            if (pctParsed === 'invalid') {
              toast.error(
                '득표율은 0~100 사이 숫자(소수 첫째 자리까지)이거나 비워 두세요.',
              )
              return
            }
            onSubmit({
              votes: votesParsed,
              voteSharePercent:
                pctParsed === null ? null : String(pctParsed),
              notes: notes.trim() || null,
            })
          }}
        >
          저장
        </PersonRegisterModalPrimaryBtn>
      </PersonRegisterModalFormActions>
    </ElectionsModalShell>
  )
}

function PartyResultFormModal({
  mode,
  parties,
  existingPartyIds,
  initialRow,
  saving,
  onClose,
  onSubmit,
}: {
  mode: 'create' | 'edit'
  parties: { id: string; name: string; shortName?: string | null }[]
  existingPartyIds: string[]
  initialRow?: ElectionPartyResultDto
  saving: boolean
  onClose: () => void
  onSubmit: (
    partyId: string,
    body: Parameters<typeof upsertElectionPartyResult>[2],
  ) => void
}) {
  const [partyId, setPartyId] = useState(initialRow?.partyId ?? '')
  const [votes, setVotes] = useState(initialRow?.votes ?? '')
  const [pct, setPct] = useState(
    initialRow?.voteSharePercent != null &&
      String(initialRow.voteSharePercent).trim() !== ''
      ? formatPercentOneDecimalForInput(initialRow.voteSharePercent)
      : '',
  )
  const [seats, setSeats] = useState(
    initialRow?.seatsWon != null ? String(initialRow.seatsWon) : '',
  )
  const [notes, setNotes] = useState(initialRow?.notes ?? '')

  const partyChoices = useMemo(() => {
    if (mode === 'edit') return []
    return parties.filter((party) => !existingPartyIds.includes(party.id))
  }, [mode, parties, existingPartyIds])

  return (
    <ElectionsModalShell
      title={mode === 'create' ? '정당 집계 추가' : '정당 집계 수정'}
      onClose={onClose}
      maxWidth="min(1120px, 96vw)"
    >
      <FormRows>
        <FieldRow>
          <FieldLabel>
            {mode === 'create' ? (
              <>
                정당 <Required>*</Required>
              </>
            ) : (
              '정당'
            )}
          </FieldLabel>
          <ModalFieldWide>
            {mode === 'create' ? (
              <FormSelectNative
                value={partyId}
                onChange={(event) => setPartyId(event.target.value)}
                aria-required
              >
                <option value="">정당 선택</option>
                {partyChoices.map((party) => (
                  <option key={party.id} value={party.id}>
                    {party.shortName || party.name}
                  </option>
                ))}
              </FormSelectNative>
            ) : (
              <div style={{ fontWeight: 600 }}>
                {initialRow?.party?.shortName ||
                  initialRow?.party?.name ||
                  initialRow?.partyId}
              </div>
            )}
          </ModalFieldWide>
        </FieldRow>
        <FieldRow>
          <FieldLabel>득표수</FieldLabel>
          <ModalFieldMedium>
            <Input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={votes}
              onChange={(e) =>
                setVotes(sanitizeVoteCountInput(e.target.value))
              }
            />
          </ModalFieldMedium>
        </FieldRow>
        <FieldRow>
          <FieldLabel>득표율 (%)</FieldLabel>
          <ModalFieldNarrow>
            <Input
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={pct}
              onChange={(e) =>
                setPct(sanitizePercentInput(e.target.value))
              }
              placeholder="0–100 · 소수 첫째 자리"
            />
          </ModalFieldNarrow>
        </FieldRow>
        <FieldRow>
          <FieldLabel>의석</FieldLabel>
          <ModalFieldNarrow>
            <Input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={seats}
              onChange={(e) =>
                setSeats(sanitizeNonNegativeIntInput(e.target.value))
              }
              placeholder="0 이상 정수 · 없으면 비움"
            />
          </ModalFieldNarrow>
        </FieldRow>
        <FieldRow>
          <FieldLabel>메모</FieldLabel>
          <ModalFieldWide>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={5} />
          </ModalFieldWide>
        </FieldRow>
      </FormRows>
      <PersonRegisterModalFormActions>
        <PersonRegisterModalCancelBtn type="button" onClick={onClose}>
          취소
        </PersonRegisterModalCancelBtn>
        <PersonRegisterModalPrimaryBtn
          type="button"
          disabled={saving}
          onClick={() => {
            const targetPartyId =
              mode === 'edit' ? initialRow!.partyId : partyId
            if (!targetPartyId) {
              toast.error('정당을 선택하세요.')
              return
            }
            const votesParsed = parseOptionalVotesDigits(votes)
            if (votesParsed === 'invalid') {
              toast.error('득표수는 숫자만 입력하거나 비워 두세요.')
              return
            }
            const pctParsed = parseOptionalPercent0to100(pct)
            if (pctParsed === 'invalid') {
              toast.error(
                '득표율은 0~100 사이 숫자(소수 첫째 자리까지)이거나 비워 두세요.',
              )
              return
            }
            const seatsParsed = parseOptionalNonNegativeInt(seats)
            if (seatsParsed === 'invalid') {
              toast.error('의석은 0 이상의 정수이거나 비워 두세요.')
              return
            }
            onSubmit(targetPartyId, {
              votes: votesParsed,
              voteSharePercent:
                pctParsed === null ? null : String(pctParsed),
              seatsWon: seatsParsed,
              notes: notes.trim() || null,
            })
          }}
        >
          저장
        </PersonRegisterModalPrimaryBtn>
      </PersonRegisterModalFormActions>
    </ElectionsModalShell>
  )
}

