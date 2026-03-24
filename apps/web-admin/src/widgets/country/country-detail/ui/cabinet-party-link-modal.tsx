/**
 * 행정부 상세 — 집권·연정 정당 연결 (조약 연결 모달과 동일: 오버레이 + 폼)
 */
import React, { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import { FiInfo, FiPlus, FiX } from 'react-icons/fi'

import {
  addCabinetPoliticalParty,
  getPoliticalParties,
} from '@/shared/api/election'
import { getApiErrorMessage } from '@/shared/lib/get-api-error-message'
import { getCabinetsSectionPalette } from '@/shared/styles/country-detail-palette'
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
  const [partyId, setPartyId] = useState('')
  const [role, setRole] = useState<string>('LEADING')
  const [notes, setNotes] = useState('')

  const countryQueryEnabled = !!(countryId || historicalCountryId)
  const { data: parties = [], isPending: partiesPending } = useQuery({
    queryKey: ['political-parties', countryId ?? '', historicalCountryId ?? ''],
    queryFn: () =>
      getPoliticalParties({
        countryId: countryId || undefined,
        historicalCountryId: historicalCountryId || undefined,
      }),
    enabled: countryQueryEnabled,
  })

  const taken = useMemo(() => new Set(linkedPartyIds), [linkedPartyIds])
  const availableParties = useMemo(
    () => parties.filter((partyRow) => !taken.has(partyRow.id)),
    [parties, taken],
  )

  const addMut = useMutation({
    mutationFn: () =>
      addCabinetPoliticalParty(cabinetId, {
        partyId,
        role,
        notes: notes.trim() ? notes.trim() : null,
      }),
    onSuccess: () => {
      toast.success('정당을 연결했습니다.')
      void queryClient.invalidateQueries({
        queryKey: ['cabinet-political-parties', cabinetId],
      })
      onClose()
    },
    onError: (error: unknown) => toast.error(getApiErrorMessage(error)),
  })

  const canSubmit =
    !!partyId &&
    countryQueryEnabled &&
    !partiesPending &&
    !addMut.isPending

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
              이 행정부의 <strong>집권·연정 관계</strong>로 묶을 정당을
              선택합니다. 정당 자체는 국가 상세 <strong>선거·투표</strong> 탭에서
              먼저 등록해야 합니다.
            </span>
          </CabS.CabinetFormDesc>

          {!countryQueryEnabled ? (
            <p style={{ margin: 0, fontSize: 14, color: palette.textMuted }}>
              국가 정보가 없어 정당 목록을 불러올 수 없습니다.
            </p>
          ) : partiesPending ? (
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
          )}

          {countryQueryEnabled && !partiesPending && parties.length === 0 ? (
            <p style={{ margin: 0, fontSize: 13, color: palette.textMuted }}>
              이 국가에 등록된 정당이 없습니다. 선거·투표 탭에서 정당을 추가한 뒤
              다시 시도하세요.
            </p>
          ) : null}
          {countryQueryEnabled &&
          !partiesPending &&
          parties.length > 0 &&
          availableParties.length === 0 ? (
            <p style={{ margin: 0, fontSize: 13, color: palette.textMuted }}>
              연결 가능한 정당이 없습니다. (이미 모두 이 행정부에 연결됨)
            </p>
          ) : null}
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
