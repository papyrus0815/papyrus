/**
 * 행정부 상세 — 집권·연정 정당 목록·해제 (연결 추가는 `CabinetPartyLinkModal`)
 * 보조 메타 정보로 취임·조약·각료보다 시각적 비중을 낮춤.
 */
import React, { useState } from 'react'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import { FiPlus, FiTrash2, FiUsers } from 'react-icons/fi'

import {
  getCabinetPoliticalParties,
  removeCabinetPoliticalParty,
} from '@/shared/api/election'
import { getApiErrorMessage } from '@/shared/lib/get-api-error-message'

import { CabinetPartyLinkModal } from './cabinet-party-link-modal'
import { labelCabinetPartyRole } from './cabinets-section.helpers'
import {
  CABINET_SECTION_MAIN as MAIN,
} from './cabinets-section.constants'
import * as CabS from './cabinets-section.styled'
import { SubsectionAddBtn } from './country-politics-tab.styles'

export type CabinetPoliticalPartiesBlockProps = {
  cabinetId: string
  countryId?: string
  historicalCountryId?: string
  isDark: boolean
}

export function CabinetPoliticalPartiesBlock({
  cabinetId,
  countryId,
  historicalCountryId,
  isDark,
}: CabinetPoliticalPartiesBlockProps) {
  const queryClient = useQueryClient()
  const [partyLinkModalOpen, setPartyLinkModalOpen] = useState(false)

  const { data: links = [], isPending: linksPending } = useQuery({
    queryKey: ['cabinet-political-parties', cabinetId],
    queryFn: () => getCabinetPoliticalParties(cabinetId),
    enabled: !!cabinetId,
  })

  const countryQueryEnabled = !!(countryId || historicalCountryId)

  const removeMut = useMutation({
    mutationFn: (linkId: string) =>
      removeCabinetPoliticalParty(cabinetId, linkId),
    onSuccess: () => {
      toast.success('연결을 해제했습니다.')
      void queryClient.invalidateQueries({
        queryKey: ['cabinet-political-parties', cabinetId],
      })
    },
    onError: (error: unknown) => toast.error(getApiErrorMessage(error)),
  })

  const loading = linksPending

  return (
    <>
      <CabS.CabDetailPartySubSection id="cab-detail-parties">
        <CabS.CabDetailMinistersSectionHeader style={{ marginBottom: 0 }}>
          <FiUsers
            size={15}
            strokeWidth={2}
            aria-hidden
            style={{ color: MAIN, flexShrink: 0 }}
          />
          <CabS.CabDetailPartySectionTitle>
            집권·연정 정당
          </CabS.CabDetailPartySectionTitle>
          <CabS.CabDetailPartyCount>{links.length}개</CabS.CabDetailPartyCount>
          <div style={{ flex: 1 }} />
          <SubsectionAddBtn
            type="button"
            onClick={() => setPartyLinkModalOpen(true)}
            disabled={!countryQueryEnabled || loading}
          >
            <FiPlus size={14} strokeWidth={2.25} />
            연결
          </SubsectionAddBtn>
        </CabS.CabDetailMinistersSectionHeader>

        {loading ? (
          <CabS.CabDetailPartyLoading>불러오는 중…</CabS.CabDetailPartyLoading>
        ) : !countryQueryEnabled ? (
          <CabS.CabDetailPartyEmpty>
            <CabS.CabDetailPartyEmptyHint>
              국가 정보가 없어 정당 목록을 불러올 수 없습니다.
            </CabS.CabDetailPartyEmptyHint>
          </CabS.CabDetailPartyEmpty>
        ) : links.length === 0 ? (
          <CabS.CabDetailPartyEmpty>
            <CabS.CabDetailPartyEmptyIconWrap aria-hidden>
              <FiUsers size={20} strokeWidth={1.5} />
            </CabS.CabDetailPartyEmptyIconWrap>
            <CabS.CabDetailEmptyText
              $fontSize="12px"
              style={{ fontStyle: 'normal' }}
            >
              연결된 정당 없음
            </CabS.CabDetailEmptyText>
            <CabS.CabDetailPartyEmptyHint>
              선거·투표 탭에서 정당을 등록한 뒤 연결할 수 있습니다.
            </CabS.CabDetailPartyEmptyHint>
            <SubsectionAddBtn
              type="button"
              onClick={() => setPartyLinkModalOpen(true)}
              disabled={loading}
            >
              <FiPlus size={14} strokeWidth={2.25} />
              연결
            </SubsectionAddBtn>
          </CabS.CabDetailPartyEmpty>
        ) : (
          <CabS.CabDetailPartyList>
            {links.map((link) => {
              const name =
                link.party?.shortName?.trim() ||
                link.party?.name ||
                '알 수 없음'
              const notesText = link.notes?.trim()
              return (
                <CabS.CabDetailPartyRow key={link.id}>
                  <CabS.CabDetailPartyRowMain>
                    <CabS.CabDetailPartyName title={name}>
                      {name}
                    </CabS.CabDetailPartyName>
                    <CabS.CabDetailPartyRoleChip>
                      {labelCabinetPartyRole(link.role)}
                    </CabS.CabDetailPartyRoleChip>
                    <CabS.CabDetailPartyRemoveBtn
                      title="연결 해제"
                      disabled={removeMut.isPending}
                      aria-label={`${name} 연결 해제`}
                      onClick={() => {
                        if (
                          !window.confirm(`「${name}」 정당 연결을 해제할까요?`)
                        )
                          return
                        removeMut.mutate(link.id)
                      }}
                    >
                      <FiTrash2 size={13} strokeWidth={2} />
                    </CabS.CabDetailPartyRemoveBtn>
                  </CabS.CabDetailPartyRowMain>
                  {link.provenance === 'FROM_ELECTION_PARTY_RESULT' &&
                  link.electionPartyResult?.election?.name ? (
                    <CabS.CabDetailPartyNotes style={{ fontStyle: 'normal' }}>
                      출처: 선거 집계 —{' '}
                      {link.electionPartyResult.election.name}
                      {link.electionPartyResult.election.pollDate
                        ? ` (${new Date(
                            link.electionPartyResult.election.pollDate,
                          ).toLocaleDateString('ko-KR')})`
                        : ''}
                    </CabS.CabDetailPartyNotes>
                  ) : null}
                  {notesText ? (
                    <CabS.CabDetailPartyNotes>{notesText}</CabS.CabDetailPartyNotes>
                  ) : null}
                </CabS.CabDetailPartyRow>
              )
            })}
          </CabS.CabDetailPartyList>
        )}
      </CabS.CabDetailPartySubSection>

      {partyLinkModalOpen ? (
        <CabinetPartyLinkModal
          cabinetId={cabinetId}
          countryId={countryId}
          historicalCountryId={historicalCountryId}
          linkedPartyIds={links.map((partyLink) => partyLink.partyId)}
          isDark={isDark}
          onClose={() => setPartyLinkModalOpen(false)}
        />
      ) : null}
    </>
  )
}
