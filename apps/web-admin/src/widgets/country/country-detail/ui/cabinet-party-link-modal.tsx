/**
 * 행정부 상세 — 집권·연정 정당 연결 (조약 연결 모달과 동일: 오버레이 + 폼)
 */
import React, { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FiInfo, FiPlus, FiX } from 'react-icons/fi'

import {
  addCabinetPoliticalParty,
  CABINET_PARTY_LINK_ELECTION_TYPES,
  getElection,
  getElections,
  getPoliticalParties,
  labelElectionType,
} from '@/shared/api/election'
import { getApiErrorMessage } from '@/shared/lib/get-api-error-message'
import { getCabinetsSectionPalette } from '@/shared/styles/country-detail-palette'
import { notify } from '@/shared/ui/toast'
import {
  ModalBody,
  ModalBox,
  ModalCloseButton,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  ModalTitle,
} from '@/shared/ui/modal/modal.styles'
import {
  FieldControl,
  FieldLabel,
  FieldRow,
  FormRows,
  SubmitButton,
  Textarea,
} from '@/shared/ui/register-form-layout'

import { CABINET_PARTY_ROLE_OPTIONS } from './cabinets-section.constants'
import * as CabS from './cabinets-section.styled'

export type CabinetPartyLinkModalProps = {
  cabinetId: string
  countryId?: string
  historicalCountryId?: string
  /** 이미 연결된 정당 — 선택 목록에서 제외 */
  linkedPartyIds: string[]
  isDark: boolean
  onClose: () => void
}

export function CabinetPartyLinkModal({
  cabinetId,
  countryId,
  historicalCountryId,
  linkedPartyIds,
  isDark,
  onClose,
}: CabinetPartyLinkModalProps) {
  const palette = getCabinetsSectionPalette(isDark)
  const queryClient = useQueryClient()
  const [linkMode, setLinkMode] = useState<'manual' | 'election'>('manual')
  const [partyId, setPartyId] = useState('')
  const [role, setRole] = useState<string>('LEADING')
  const [notes, setNotes] = useState('')
  const [electionId, setElectionId] = useState('')
  const [partyResultId, setPartyResultId] = useState('')

  const countryQueryEnabled = !!(countryId || historicalCountryId)
  const { data: parties = [], isPending: partiesPending } = useQuery({
    queryKey: ['political-parties', countryId ?? '', historicalCountryId ?? ''],
    queryFn: () =>
      getPoliticalParties({
        countryId: countryId || undefined,
        historicalCountryId: historicalCountryId || undefined,
      }),
    enabled: countryQueryEnabled && linkMode === 'manual',
  })

  const { data: electionsList = [], isPending: electionsPending } = useQuery({
    queryKey: [
      'elections-for-cabinet-party',
      countryId ?? '',
      historicalCountryId ?? '',
      'partyResults',
      CABINET_PARTY_LINK_ELECTION_TYPES.join(','),
    ],
    queryFn: () =>
      getElections({
        countryId: countryId || undefined,
        historicalCountryId: historicalCountryId || undefined,
        hasPartyResults: true,
        electionTypes: CABINET_PARTY_LINK_ELECTION_TYPES,
      }),
    enabled: countryQueryEnabled && linkMode === 'election',
  })

  const { data: electionDetail, isPending: electionDetailPending } = useQuery({
    queryKey: ['election-detail', electionId],
    queryFn: () => getElection(electionId),
    enabled: !!electionId && linkMode === 'election',
  })

  const taken = useMemo(() => new Set(linkedPartyIds), [linkedPartyIds])
  const availableParties = useMemo(
    () => parties.filter((partyRow) => !taken.has(partyRow.id)),
    [parties, taken],
  )

  const availablePartyResults = useMemo(() => {
    const prs = electionDetail?.partyResults ?? []
    return prs.filter((row) => !taken.has(row.partyId))
  }, [electionDetail?.partyResults, taken])

  const addMut = useMutation({
    mutationFn: () => {
      if (linkMode === 'election') {
        const row = electionDetail?.partyResults?.find((r) => r.id === partyResultId)
        if (!row) throw new Error('선거 집계를 선택하세요.')
        return addCabinetPoliticalParty(cabinetId, {
          partyId: row.partyId,
          role,
          notes: notes.trim() ? notes.trim() : null,
          provenance: 'FROM_ELECTION_PARTY_RESULT',
          electionPartyResultId: row.id,
        })
      }
      return addCabinetPoliticalParty(cabinetId, {
        partyId,
        role,
        notes: notes.trim() ? notes.trim() : null,
        provenance: 'MANUAL',
      })
    },
    onSuccess: () => {
      notify.success('정당을 연결했습니다.')
      void queryClient.invalidateQueries({
        queryKey: ['cabinet-political-parties', cabinetId],
      })
      onClose()
    },
    onError: (error: unknown) => notify.error(getApiErrorMessage(error)),
  })

  const canSubmit =
    countryQueryEnabled &&
    !addMut.isPending &&
    (linkMode === 'manual'
      ? !!partyId && !partiesPending
      : !!electionId &&
        !!partyResultId &&
        !electionsPending &&
        !electionDetailPending)

  const content = (
    <ModalOverlay
      role="dialog"
      aria-modal="true"
      aria-labelledby="cabinet-party-link-modal-title"
      onClick={(event) => {
        if (event.target === event.currentTarget && !addMut.isPending) onClose()
      }}
    >
      <ModalBox
        $maxWidth="min(900px, calc(100vw - 48px))"
        onClick={(event) => event.stopPropagation()}
      >
        <ModalHeader>
          <ModalTitle id="cabinet-party-link-modal-title">정당 연결</ModalTitle>
          <ModalCloseButton
            type="button"
            onClick={() => !addMut.isPending && onClose()}
            aria-label="닫기"
          >
            <FiX size={22} strokeWidth={2} />
          </ModalCloseButton>
        </ModalHeader>
        <ModalBody>
          <CabS.CabinetFormDesc>
            <FiInfo size={20} />
            <span>
              <strong>정당만 연결</strong>: 목록에서 정당·역할을 고릅니다.{' '}
              <strong>선거 집계에서 연결</strong>: 정당 집계가 있는 선거만
              표시됩니다(국민투표·다중 안건 유형 제외). 선거·투표 탭에서 집계를
              입력한 뒤 여기서 출처를 맞춥니다.
            </span>
          </CabS.CabinetFormDesc>

          {!countryQueryEnabled ? (
            <p style={{ margin: 0, fontSize: 14, color: palette.textMuted }}>
              국가 정보가 없어 목록을 불러올 수 없습니다.
            </p>
          ) : (
            <>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 8,
                  marginBottom: 16,
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setLinkMode('manual')
                    setElectionId('')
                    setPartyResultId('')
                  }}
                  disabled={addMut.isPending}
                  style={{
                    padding: '8px 14px',
                    fontSize: 13,
                    fontWeight: 600,
                    borderRadius: 8,
                    border:
                      linkMode === 'manual'
                        ? '1px solid #6366f1'
                        : '1px solid #e2e8f0',
                    background:
                      linkMode === 'manual'
                        ? 'rgba(99, 102, 241, 0.12)'
                        : 'transparent',
                    color: linkMode === 'manual' ? '#4338ca' : palette.textMuted,
                    cursor: 'pointer',
                  }}
                >
                  정당만 연결
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLinkMode('election')
                    setPartyId('')
                  }}
                  disabled={addMut.isPending}
                  style={{
                    padding: '8px 14px',
                    fontSize: 13,
                    fontWeight: 600,
                    borderRadius: 8,
                    border:
                      linkMode === 'election'
                        ? '1px solid #6366f1'
                        : '1px solid #e2e8f0',
                    background:
                      linkMode === 'election'
                        ? 'rgba(99, 102, 241, 0.12)'
                        : 'transparent',
                    color:
                      linkMode === 'election' ? '#4338ca' : palette.textMuted,
                    cursor: 'pointer',
                  }}
                >
                  선거 집계에서 연결
                </button>
              </div>

              {linkMode === 'manual' ? (
                partiesPending ? (
                  <p style={{ margin: 0, fontSize: 14, color: palette.textMuted }}>
                    정당 목록을 불러오는 중…
                  </p>
                ) : (
                  <FormRows>
                    <FieldRow>
                      <FieldLabel>정당</FieldLabel>
                      <FieldControl>
                        <CabS.CabinetSelectNative
                          value={partyId}
                          onChange={(event) => setPartyId(event.target.value)}
                          aria-label="연결할 정당"
                          style={{ maxWidth: '100%' }}
                        >
                          <option value="">선택…</option>
                          {availableParties.map((partyRow) => (
                            <option key={partyRow.id} value={partyRow.id}>
                              {partyRow.shortName?.trim() || partyRow.name}
                            </option>
                          ))}
                        </CabS.CabinetSelectNative>
                      </FieldControl>
                    </FieldRow>
                    <FieldRow>
                      <FieldLabel>역할</FieldLabel>
                      <FieldControl>
                        <CabS.CabinetSelectNative
                          value={role}
                          onChange={(event) => setRole(event.target.value)}
                          aria-label="역할"
                          style={{ maxWidth: '100%' }}
                        >
                          {CABINET_PARTY_ROLE_OPTIONS.map((roleOption) => (
                            <option key={roleOption.value} value={roleOption.value}>
                              {roleOption.label}
                            </option>
                          ))}
                        </CabS.CabinetSelectNative>
                      </FieldControl>
                    </FieldRow>
                    <FieldRow>
                      <FieldLabel>비고 (선택)</FieldLabel>
                      <FieldControl>
                        <Textarea
                          value={notes}
                          onChange={(event) => setNotes(event.target.value)}
                          placeholder="예: 연정 비율, 비교섭 단위 등"
                          rows={3}
                          style={{ marginBottom: 0, minHeight: 72 }}
                        />
                      </FieldControl>
                    </FieldRow>
                  </FormRows>
                )
              ) : electionsPending ? (
                <p style={{ margin: 0, fontSize: 14, color: palette.textMuted }}>
                  선거 목록을 불러오는 중…
                </p>
              ) : (
                <FormRows>
                  <FieldRow>
                    <FieldLabel>선거</FieldLabel>
                    <FieldControl>
                      <CabS.CabinetSelectNative
                        value={electionId}
                        onChange={(event) => {
                          setElectionId(event.target.value)
                          setPartyResultId('')
                        }}
                        aria-label="선거 선택"
                        style={{ maxWidth: '100%' }}
                      >
                        <option value="">선택…</option>
                        {electionsList.map((el) => (
                          <option key={el.id} value={el.id}>
                            {el.shortName?.trim() || el.name} ·{' '}
                            {labelElectionType(el.electionType)} ·{' '}
                            {new Date(el.pollDate).toLocaleDateString('ko-KR')}
                          </option>
                        ))}
                      </CabS.CabinetSelectNative>
                    </FieldControl>
                  </FieldRow>
                  {electionId ? (
                    electionDetailPending ? (
                      <p
                        style={{
                          margin: 0,
                          fontSize: 14,
                          color: palette.textMuted,
                        }}
                      >
                        선거 상세·정당 집계를 불러오는 중…
                      </p>
                    ) : (
                      <>
                        <FieldRow>
                          <FieldLabel>정당 집계</FieldLabel>
                          <FieldControl>
                            <CabS.CabinetSelectNative
                              value={partyResultId}
                              onChange={(event) =>
                                setPartyResultId(event.target.value)
                              }
                              aria-label="선거별 정당 집계"
                              style={{ maxWidth: '100%' }}
                            >
                              <option value="">선택…</option>
                              {availablePartyResults.map((pr) => {
                                const pn =
                                  pr.party?.shortName?.trim() ||
                                  pr.party?.name ||
                                  '정당'
                                const seats =
                                  pr.seatsWon != null
                                    ? `의석 ${pr.seatsWon}`
                                    : pr.voteSharePercent != null
                                      ? `득표율 ${pr.voteSharePercent}%`
                                      : ''
                                return (
                                  <option key={pr.id} value={pr.id}>
                                    {pn}
                                    {seats ? ` · ${seats}` : ''}
                                  </option>
                                )
                              })}
                            </CabS.CabinetSelectNative>
                          </FieldControl>
                        </FieldRow>
                        {availablePartyResults.length === 0 ? (
                          <p
                            style={{
                              margin: 0,
                              fontSize: 13,
                              color: palette.textMuted,
                            }}
                          >
                            이 선거에서 연결할 수 있는 정당 집계가 없습니다.
                            (이미 이 행정부에 연결된 정당이거나 집계가 없습니다.)
                          </p>
                        ) : null}
                      </>
                    )
                  ) : null}
                  <FieldRow>
                    <FieldLabel>역할</FieldLabel>
                    <FieldControl>
                      <CabS.CabinetSelectNative
                        value={role}
                        onChange={(event) => setRole(event.target.value)}
                        aria-label="역할"
                        style={{ maxWidth: '100%' }}
                      >
                        {CABINET_PARTY_ROLE_OPTIONS.map((roleOption) => (
                          <option key={roleOption.value} value={roleOption.value}>
                            {roleOption.label}
                          </option>
                        ))}
                      </CabS.CabinetSelectNative>
                    </FieldControl>
                  </FieldRow>
                  <FieldRow>
                    <FieldLabel>비고 (선택)</FieldLabel>
                    <FieldControl>
                      <Textarea
                        value={notes}
                        onChange={(event) => setNotes(event.target.value)}
                        placeholder="예: 연정 비율, 비교섭 단위 등"
                        rows={3}
                        style={{ marginBottom: 0, minHeight: 72 }}
                      />
                    </FieldControl>
                  </FieldRow>
                </FormRows>
              )}

              {linkMode === 'manual' &&
              !partiesPending &&
              parties.length === 0 ? (
                <p style={{ margin: '12px 0 0', fontSize: 13, color: palette.textMuted }}>
                  이 국가에 등록된 정당이 없습니다. 선거·투표 탭에서 정당을 추가한
                  뒤 다시 시도하세요.
                </p>
              ) : null}
              {linkMode === 'manual' &&
              !partiesPending &&
              parties.length > 0 &&
              availableParties.length === 0 ? (
                <p style={{ margin: '12px 0 0', fontSize: 13, color: palette.textMuted }}>
                  연결 가능한 정당이 없습니다. (이미 모두 이 행정부에 연결됨)
                </p>
              ) : null}
              {linkMode === 'election' &&
              !electionsPending &&
              electionsList.length === 0 ? (
                <p style={{ margin: '12px 0 0', fontSize: 13, color: palette.textMuted }}>
                  조건에 맞는 선거가 없습니다. 선거·투표 탭에서 선거를 등록하고
                  해당 선거에 <strong>정당 집계</strong>를 입력했는지 확인하세요.
                  (국민투표·다중 안건 유형은 행정부 연결 목록에서 제외됩니다.)
                </p>
              ) : null}
            </>
          )}
        </ModalBody>
        <ModalFooter>
          <CabS.CabinetCancelBtn
            type="button"
            onClick={() => !addMut.isPending && onClose()}
          >
            취소
          </CabS.CabinetCancelBtn>
          <SubmitButton
            type="button"
            disabled={!canSubmit}
            onClick={() => addMut.mutate()}
          >
            <FiPlus size={16} />
            {addMut.isPending ? '연결 중…' : '연결'}
          </SubmitButton>
        </ModalFooter>
      </ModalBox>
    </ModalOverlay>
  )

  if (typeof document === 'undefined') return null
  return createPortal(content, document.body)
}
