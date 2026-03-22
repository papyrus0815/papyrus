import React, { useCallback, useMemo, useState } from 'react'

import { createPortal } from 'react-dom'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FiCalendar, FiChevronDown, FiPlus, FiTrash2, FiX } from 'react-icons/fi'
import { toast } from 'react-hot-toast'
import styled from 'styled-components'

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
  getElection,
  getElections,
  getElectoralDistricts,
  getPoliticalParties,
  labelElectionStatus,
  labelElectionType,
  labelNominationType,
  NOMINATION_TYPE_OPTIONS,
  updateBallotOption,
  updateElection,
  updateElectionCandidacy,
  upsertBallotOptionResult,
  upsertCandidacyResult,
} from '@/shared/api/election'
import { useClickSound } from '@/shared/hooks/use-click-sound.hook'
import { getPersonDisplayName } from '@/shared/lib/person-display-name'
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
  DetailTitle,
  DetailToolbar,
  ElectedBadge,
  EmptyHint,
  FormSelectNative,
  InlineTextInput,
  ListColumn,
  PoliticsTabPanel,
  SectionHeaderRow,
  SectionKicker,
  SectionLead,
  SplitMainRow,
  SubsectionLabel,
  ToolbarDangerBtn,
  ToolbarDangerBtnSm,
  ToolbarGhostBtn,
  ToolbarGhostBtnSm,
  ToolbarPrimaryBtn,
  ElectionNavButton,
  ElectionNavMeta,
  ElectionNavTitle,
} from './country-politics-tab.styles'

const qk = {
  list: (countryId: string) => ['elections', 'list', countryId] as const,
  detail: (id: string) => ['elections', 'detail', id] as const,
  parties: (countryId: string) => ['political-parties', countryId] as const,
  districts: (countryId: string) => ['electoral-districts', countryId] as const,
}

const FullWidthControl = styled(FieldControl)`
  max-width: 100% !important;
  width: 100%;
`

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

function candidacyLabel(c: ElectionCandidacyDto) {
  if (c.person) {
    return getPersonDisplayName({
      name: c.person.name,
      surname: c.person.surname,
    })
  }
  if (c.party) return c.party.shortName || c.party.name
  return '(후보 정보 없음)'
}

export interface CountryElectionsSectionProps {
  countryId: string
}

export function CountryElectionsSection({ countryId }: CountryElectionsSectionProps) {
  const queryClient = useQueryClient()
  const { data: persons = [] } = usePersons()
  const [selectedId, setSelectedId] = useState<string | null>(null)

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

  const { data: list = [], isLoading: listLoading } = useQuery({
    queryKey: qk.list(countryId),
    queryFn: () => getElections({ countryId }),
    enabled: !!countryId,
  })

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: qk.detail(selectedId ?? ''),
    queryFn: () => getElection(selectedId!),
    enabled: !!selectedId,
  })

  const { data: parties = [] } = useQuery({
    queryKey: qk.parties(countryId),
    queryFn: () => getPoliticalParties({ countryId }),
    enabled: !!countryId,
  })

  const { data: districts = [] } = useQuery({
    queryKey: qk.districts(countryId),
    queryFn: () => getElectoralDistricts({ countryId }),
    enabled: !!countryId,
  })

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: qk.list(countryId) })
    if (selectedId)
      queryClient.invalidateQueries({ queryKey: qk.detail(selectedId) })
  }, [queryClient, countryId, selectedId])

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
    mutationFn: (p: { electionId: string; label: string }) =>
      createBallotOption(p.electionId, { label: p.label, sortOrder: 0 }),
    onSuccess: () => {
      invalidate()
      toast.success('투표 안이 추가되었습니다.')
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
            아래에서 이 국가 소속 정당을 등록한 뒤, 선거·후보 편집에서 정당을 선택할 수 있습니다.
            선거구는 API로만 등록 중이면 별도 도구를 사용하세요.
          </SectionLead>
        </div>
        <ToolbarPrimaryBtn type="button" onClick={() => setElectionModal({ mode: 'create' })}>
          <FiPlus size={16} />
          새 선거
        </ToolbarPrimaryBtn>
      </SectionHeaderRow>

      <CountryPoliticalPartiesBlock countryId={countryId} />

      <SplitMainRow>
        <ListColumn>
          {listLoading ? (
            <EmptyHint>목록 불러오는 중…</EmptyHint>
          ) : sortedList.length === 0 ? (
            <EmptyHint>등록된 선거가 없습니다.「새 선거」로 추가하세요.</EmptyHint>
          ) : (
            sortedList.map((e) => (
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
            ))
          )}
        </ListColumn>

        <DetailColumn>
          {!selectedId ? (
            <EmptyHint style={{ fontSize: 14 }}>
              왼쪽에서 선거를 선택하면 상세·후보 편집이 열립니다.
            </EmptyHint>
          ) : detailLoading || !detail ? (
            <EmptyHint>상세 불러오는 중…</EmptyHint>
          ) : (
            <ElectionDetailPanel
              detail={detail}
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
              onAddBallotOption={(label) =>
                ballotCreateMut.mutate({ electionId: detail.id, label })
              }
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

      {electionModal && (
        <ElectionFormModal
          countryId={countryId}
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
    </PoliticsTabPanel>
  )
}

function ElectionDetailPanel({
  detail,
  onEditElection,
  onDeleteElection,
  onAddCandidacy,
  onEditCandidacy,
  onDeleteCandidacy,
  onEditResult,
  onAddBallotOption,
  onDeleteBallotOption,
  onEditBallotResult,
}: {
  detail: ElectionDetailDto
  onEditElection: () => void
  onDeleteElection: () => void
  onAddCandidacy: () => void
  onEditCandidacy: (row: ElectionCandidacyDto) => void
  onDeleteCandidacy: (row: ElectionCandidacyDto) => void
  onEditResult: (row: ElectionCandidacyDto) => void
  onAddBallotOption: (label: string) => void
  onDeleteBallotOption: (opt: ElectionBallotOptionDto) => void
  onEditBallotResult: (opt: ElectionBallotOptionDto) => void
}) {
  const isReferendum = detail.electionType === 'REFERENDUM_OR_PLEBISCITE'
  const [ballotLabel, setBallotLabel] = useState('')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <SectionHeaderRow style={{ alignItems: 'flex-start' }}>
        <div>
          <DetailTitle>{detail.name}</DetailTitle>
          <DetailMeta>
            {labelElectionType(detail.electionType)} ·{' '}
            {labelElectionStatus(detail.status)} · {formatPollDate(detail.pollDate)}
          </DetailMeta>
          {detail.description ? (
            <DetailDescription>{detail.description}</DetailDescription>
          ) : null}
        </div>
        <DetailToolbar>
          <ToolbarGhostBtn type="button" onClick={onEditElection}>
            선거 수정
          </ToolbarGhostBtn>
          <ToolbarDangerBtn type="button" onClick={onDeleteElection}>
            <FiTrash2 size={14} />
            삭제
          </ToolbarDangerBtn>
        </DetailToolbar>
      </SectionHeaderRow>

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
            <ToolbarPrimaryBtn
              type="button"
              onClick={() => {
                const t = ballotLabel.trim()
                if (!t) {
                  toast.error('안 제목을 입력하세요.')
                  return
                }
                onAddBallotOption(t)
                setBallotLabel('')
              }}
            >
              <FiPlus size={15} />
              추가
            </ToolbarPrimaryBtn>
          </BallotAddRow>
          <DataTableCard>
            <DataTable>
              <thead>
                <tr>
                  <DataTh>안</DataTh>
                  <DataTh>득표</DataTh>
                  <DataTh>득표율</DataTh>
                  <DataTh style={{ width: 140 }} />
                </tr>
              </thead>
              <tbody>
                {detail.ballotOptions.length === 0 ? (
                  <DataTr>
                    <DataTd colSpan={4}>
                      <EmptyHint>등록된 투표 안이 없습니다.</EmptyHint>
                    </DataTd>
                  </DataTr>
                ) : (
                  detail.ballotOptions.map((opt) => (
                    <DataTr key={opt.id}>
                      <DataTd>{opt.label}</DataTd>
                      <DataTd>{opt.result?.votes ?? '—'}</DataTd>
                      <DataTd>
                        {opt.result?.voteSharePercent != null
                          ? `${opt.result.voteSharePercent}%`
                          : '—'}
                      </DataTd>
                      <DataTd>
                        <ToolbarGhostBtnSm type="button" onClick={() => onEditBallotResult(opt)}>
                          집계
                        </ToolbarGhostBtnSm>
                        <ToolbarDangerBtnSm
                          type="button"
                          style={{ marginLeft: 6 }}
                          onClick={() => onDeleteBallotOption(opt)}
                        >
                          삭제
                        </ToolbarDangerBtnSm>
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
            <ToolbarPrimaryBtn type="button" onClick={onAddCandidacy}>
              <FiPlus size={15} />
              후보 추가
            </ToolbarPrimaryBtn>
          </SectionHeaderRow>
          <DataTableCard>
            <DataTable>
              <thead>
                <tr>
                  <DataTh>후보·정당</DataTh>
                  <DataTh>선거구</DataTh>
                  <DataTh>지명</DataTh>
                  <DataTh>득표</DataTh>
                  <DataTh style={{ width: 200 }} />
                </tr>
              </thead>
              <tbody>
                {detail.candidacies.length === 0 ? (
                  <DataTr>
                    <DataTd colSpan={5}>
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
                        <ToolbarGhostBtnSm type="button" onClick={() => onEditResult(c)}>
                          득표
                        </ToolbarGhostBtnSm>
                        <ToolbarGhostBtnSm type="button" onClick={() => onEditCandidacy(c)}>
                          수정
                        </ToolbarGhostBtnSm>
                        <ToolbarDangerBtnSm type="button" onClick={() => onDeleteCandidacy(c)}>
                          삭제
                        </ToolbarDangerBtnSm>
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
  countryId,
  mode,
  initial,
  saving,
  onClose,
  onSubmit,
}: {
  countryId: string
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
    initial ? initial.pollDate.slice(0, 10) : new Date().toISOString().slice(0, 10),
  )
  const [description, setDescription] = useState(initial?.description ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const playClickSound = useClickSound()
  const [pollModalOpen, setPollModalOpen] = useState(false)

  const title = mode === 'create' ? '새 선거' : '선거 수정'

  return (
    <>
      <ElectionsModalShell title={title} onClose={onClose}>
        <FormRows>
          <FieldRow>
            <FieldLabel>명칭</FieldLabel>
            <ModalFieldWide>
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
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
            <FieldLabel>투표일</FieldLabel>
            <FieldControl $variant="datePair">
              <SelectClearRow style={{ maxWidth: '100%' }}>
                <DateFieldBtn
                  type="button"
                  $hasValue={!!pollDate}
                  onClick={() => {
                    playClickSound()
                    setPollModalOpen(true)
                  }}
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
              const iso = `${pollDate}T12:00:00.000Z`
              if (mode === 'create') {
                onSubmit({
                  mode: 'create',
                  body: {
                    name: name.trim(),
                    shortName: shortName.trim() || null,
                    electionType,
                    status,
                    pollDate: iso,
                    countryId,
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
          <FullWidthControl>
            <FormSelectNative value={partyId} onChange={(e) => setPartyId(e.target.value)}>
              <option value="">(없음)</option>
              {parties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.shortName || p.name}
                </option>
              ))}
            </FormSelectNative>
          </FullWidthControl>
        </FieldRow>
        <FieldRow>
          <FieldLabel>선거구</FieldLabel>
          <FullWidthControl>
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
          </FullWidthControl>
        </FieldRow>
        <FieldRow>
          <FieldLabel>지명 방식</FieldLabel>
          <FullWidthControl>
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
          </FullWidthControl>
        </FieldRow>
        <FieldRow>
          <FieldLabel>기표 순서</FieldLabel>
          <FullWidthControl>
            <Input
              value={ballotOrder}
              onChange={(e) => setBallotOrder(e.target.value)}
              placeholder="숫자"
            />
          </FullWidthControl>
        </FieldRow>
        <FieldRow>
          <FieldLabel>비례 순번</FieldLabel>
          <FullWidthControl>
            <Input
              value={listRank}
              onChange={(e) => setListRank(e.target.value)}
              placeholder="숫자"
            />
          </FullWidthControl>
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
            const body: Parameters<typeof createElectionCandidacy>[1] = {
              personId: personId || null,
              partyId: partyId || null,
              electoralDistrictId: districtId || null,
              nominationType,
              ballotOrder: ballotOrder === '' ? null : Number(ballotOrder),
              listRank: listRank === '' ? null : Number(listRank),
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
  const [pct, setPct] = useState(initial?.voteSharePercent ?? '')
  const [rank, setRank] = useState(
    initial?.resultRank != null ? String(initial.resultRank) : '',
  )
  const [elected, setElected] = useState(initial?.elected ?? false)
  const [notes, setNotes] = useState(initial?.notes ?? '')

  return (
    <ElectionsModalShell title="득표·결과" onClose={onClose}>
      <FormRows>
        <FieldRow>
          <FieldLabel>득표수</FieldLabel>
          <FullWidthControl>
            <Input value={votes} onChange={(e) => setVotes(e.target.value)} />
          </FullWidthControl>
        </FieldRow>
        <FieldRow>
          <FieldLabel>득표율 (%)</FieldLabel>
          <FullWidthControl>
            <Input value={pct} onChange={(e) => setPct(e.target.value)} />
          </FullWidthControl>
        </FieldRow>
        <FieldRow>
          <FieldLabel>순위</FieldLabel>
          <FullWidthControl>
            <Input value={rank} onChange={(e) => setRank(e.target.value)} />
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
          onClick={() =>
            onSubmit({
              votes: votes.trim() || null,
              voteSharePercent: pct.trim() || null,
              resultRank: rank === '' ? null : Number(rank),
              elected,
              notes: notes.trim() || null,
            })
          }
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
  const [pct, setPct] = useState(option.result?.voteSharePercent ?? '')
  const [notes, setNotes] = useState(option.result?.notes ?? '')

  return (
    <ElectionsModalShell title={`「${option.label}」집계`} onClose={onClose}>
      <FormRows>
        <FieldRow>
          <FieldLabel>득표수</FieldLabel>
          <FullWidthControl>
            <Input value={votes} onChange={(e) => setVotes(e.target.value)} />
          </FullWidthControl>
        </FieldRow>
        <FieldRow>
          <FieldLabel>득표율 (%)</FieldLabel>
          <FullWidthControl>
            <Input value={pct} onChange={(e) => setPct(e.target.value)} />
          </FullWidthControl>
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
          onClick={() =>
            onSubmit({
              votes: votes.trim() || null,
              voteSharePercent: pct.trim() || null,
              notes: notes.trim() || null,
            })
          }
        >
          저장
        </PersonRegisterModalPrimaryBtn>
      </PersonRegisterModalFormActions>
    </ElectionsModalShell>
  )
}
