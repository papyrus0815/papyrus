/**
 * 행정부 상세 — 집권·연정 정당 목록·해제 (연결 추가는 `CabinetPartyLinkModal`)
 * 보조 메타 정보로 취임·조약·각료보다 시각적 비중을 낮춤.
 */
import React, { useState } from 'react'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FiCheck, FiPlus, FiTrash2, FiUsers } from 'react-icons/fi'
import styled from 'styled-components'

import {
  addCabinetPoliticalParty,
  getCabinetPoliticalParties,
  removeCabinetPoliticalParty,
  updateCabinetPoliticalParty,
} from '@/shared/api/election'
import { getApiErrorMessage } from '@/shared/lib/get-api-error-message'
import { parseIsoDateParts } from '@/shared/lib/iso-date'
import { getCabinetsSectionPalette } from '@/shared/styles/country-detail-palette'
import { confirm } from '@/shared/ui/confirm-dialog'
import { notify } from '@/shared/ui/toast'

import { CabinetPartyLinkModal } from './cabinet-party-link-modal'
import {
  CABINET_PARTY_ROLE_OPTIONS,
  CABINET_SECTION_MAIN as MAIN,
} from './cabinets-section.constants'
import * as CabS from './cabinets-section.styled'
import { SubsectionAddBtn } from './country-politics-tab.styles'

const BrandDot = styled.span<{ $color: string }>`
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  flex-shrink: 0;
  box-shadow: 0 0 0 1px rgba(15, 23, 42, 0.12);
`

const InlineRoleSelect = styled.select`
  padding: 3px 8px;
  font-size: 11.5px;
  font-weight: 600;
  border-radius: 6px;
  border: 1px solid
    ${({ theme }) =>
      getCabinetsSectionPalette(theme.mode === 'dark').borderMid};
  background: ${({ theme }) =>
    getCabinetsSectionPalette(theme.mode === 'dark').inputBg};
  color: ${({ theme }) =>
    getCabinetsSectionPalette(theme.mode === 'dark').text};
  cursor: pointer;
  outline: none;

  &:focus {
    border-color: ${MAIN};
  }
`

/**
 * 읽기 화면에선 역할을 글자 꼬리표처럼, 행에 마우스를 올리거나 초점이 들어올 때만 고르기 칸·해제 단추로 —
 * 예전엔 정당마다 선택 상자와 휴지통이 늘 펼쳐져 읽는 화면이 편집 화면처럼 보였다. 터치 기기는 늘 보인다.
 */
const PartyRow = styled(CabS.CabDetailPartyRow)`
  @media (hover: hover) {
    ${InlineRoleSelect} {
      appearance: none;
      border-color: transparent;
      background: ${({ theme }) =>
        theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#f1f5f9'};
      color: ${({ theme }) => theme.colors.text.secondary};
    }
    ${CabS.CabDetailPartyRemoveBtn} {
      opacity: 0;
      transition: opacity 0.12s ease;
    }
    &:hover ${InlineRoleSelect}, &:focus-within ${InlineRoleSelect} {
      appearance: auto;
      border-color: ${({ theme }) =>
        getCabinetsSectionPalette(theme.mode === 'dark').borderMid};
      background: ${({ theme }) =>
        getCabinetsSectionPalette(theme.mode === 'dark').inputBg};
      color: ${({ theme }) => getCabinetsSectionPalette(theme.mode === 'dark').text};
    }
    &:hover ${CabS.CabDetailPartyRemoveBtn},
      &:focus-within ${CabS.CabDetailPartyRemoveBtn} {
      opacity: 1;
    }
  }
`

const HeadPartySuggestBanner = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 10px;
  padding: 9px 12px;
  border-radius: 9px;
  border: 1px dashed rgba(37, 99, 235, 0.35);
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? 'rgba(37, 99, 235, 0.12)'
      : 'rgba(37, 99, 235, 0.05)'};
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const QuickLinkBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  border-radius: 7px;
  border: 1px solid ${MAIN};
  background: ${MAIN};
  color: #ffffff;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
`

function formatPollDateSafe(raw?: string | null): string {
  if (!raw?.trim()) return ''
  const parts = parseIsoDateParts(raw)
  if (parts) {
    const yearStr = parts.year < 0 ? `BC ${-parts.year}` : `${parts.year}`
    return `${yearStr}.${String(parts.month).padStart(2, '0')}.${String(parts.day).padStart(2, '0')}`
  }
  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return ''
  return parsed.toLocaleDateString('ko-KR', { timeZone: 'UTC' })
}

export type CabinetPoliticalPartiesBlockProps = {
  cabinetId: string
  countryId?: string
  historicalCountryId?: string
  headTenureParty?: {
    id: string
    name: string
    shortName?: string | null
    brandColor?: string | null
  } | null
  isDark: boolean
}

export function CabinetPoliticalPartiesBlock({
  cabinetId,
  countryId,
  historicalCountryId,
  headTenureParty = null,
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

  const invalidatePartyCaches = () => {
    void queryClient.invalidateQueries({
      queryKey: ['cabinet-political-parties', cabinetId],
    })
    void queryClient.invalidateQueries({ queryKey: ['cabinets-by-country'] })
    void queryClient.invalidateQueries({ queryKey: ['cabinets'] })
    void queryClient.invalidateQueries({ queryKey: ['global-cabinets'] })
    void queryClient.invalidateQueries({ queryKey: ['global-cabinet-detail'] })
    void queryClient.invalidateQueries({ queryKey: ['cabinet-overview'] })
  }

  const removeMut = useMutation({
    mutationFn: (linkId: string) =>
      removeCabinetPoliticalParty(cabinetId, linkId),
    onSuccess: () => {
      notify.success('연결을 해제했습니다.')
      invalidatePartyCaches()
    },
    onError: (error: unknown) => notify.error(getApiErrorMessage(error)),
  })

  const updateRoleMut = useMutation({
    mutationFn: ({ linkId, role }: { linkId: string; role: string }) =>
      updateCabinetPoliticalParty(cabinetId, linkId, { role }),
    onSuccess: () => {
      notify.success('정당 역할을 변경했습니다.')
      invalidatePartyCaches()
    },
    onError: (error: unknown) => notify.error(getApiErrorMessage(error)),
  })

  const quickLinkHeadPartyMut = useMutation({
    mutationFn: () => {
      if (!headTenureParty?.id) throw new Error('수반 소속 정당이 없습니다.')
      return addCabinetPoliticalParty(cabinetId, {
        partyId: headTenureParty.id,
        role: 'LEADING',
        provenance: 'FROM_HEAD_CANDIDACY',
      })
    },
    onSuccess: () => {
      notify.success('수반 소속 정당을 집권·주도 정당으로 연결했습니다.')
      invalidatePartyCaches()
    },
    onError: (error: unknown) => notify.error(getApiErrorMessage(error)),
  })

  const loading = linksPending
  const headPartyDisplayName =
    headTenureParty?.shortName?.trim() || headTenureParty?.name || null
  const showHeadPartyQuickLink =
    Boolean(headTenureParty?.id) &&
    !loading &&
    !links.some((linkItem) => linkItem.partyId === headTenureParty?.id)

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
            정당 연결
          </SubsectionAddBtn>
        </CabS.CabDetailMinistersSectionHeader>

        {showHeadPartyQuickLink && headPartyDisplayName ? (
          <HeadPartySuggestBanner>
            <span>
              수반 재임에 소속 정당 <strong>{headPartyDisplayName}</strong>이(가)
              지정되어 있으나 내각 집권·연정 구성에는 아직 연결되지 않았습니다.
            </span>
            <QuickLinkBtn
              type="button"
              disabled={quickLinkHeadPartyMut.isPending}
              onClick={() => quickLinkHeadPartyMut.mutate()}
            >
              <FiCheck size={12.5} />
              <span>집권당으로 바로 연결</span>
            </QuickLinkBtn>
          </HeadPartySuggestBanner>
        ) : null}

        {loading ? (
          <CabS.CabMinistersLoadingBox aria-busy="true" aria-live="polite">
            정당 불러오는 중…
          </CabS.CabMinistersLoadingBox>
        ) : !countryQueryEnabled ? (
          <CabS.CabDetailEmptyStack $padding="20px 0 24px">
            <CabS.CabDetailPartyEmptyHint>
              국가 정보가 없어 정당 목록을 불러올 수 없습니다.
            </CabS.CabDetailPartyEmptyHint>
          </CabS.CabDetailEmptyStack>
        ) : links.length === 0 ? (
          <CabS.CabDetailEmptyStack $padding="24px 0 28px">
            <CabS.CabDetailPartyEmptyIconWrap aria-hidden>
              <FiUsers size={26} strokeWidth={1.5} />
            </CabS.CabDetailPartyEmptyIconWrap>
            <CabS.CabDetailEmptyText>
              연결된 정당이 없습니다.
            </CabS.CabDetailEmptyText>
            <CabS.CabDetailPartyEmptyHint>
              선거·투표 탭에서 정당을 등록한 뒤 연결할 수 있습니다.
            </CabS.CabDetailPartyEmptyHint>
          </CabS.CabDetailEmptyStack>
        ) : (
          <CabS.CabDetailPartyList>
            {links.map((link) => {
              const name =
                link.party?.shortName?.trim() ||
                link.party?.name ||
                '알 수 없음'
              const brandColor = link.party?.brandColor?.trim() || null
              const notesText = link.notes?.trim()
              const pollLabel = formatPollDateSafe(
                link.electionPartyResult?.election?.pollDate,
              )
              const roleKnown = CABINET_PARTY_ROLE_OPTIONS.some(
                (opt) => opt.value === link.role,
              )
              return (
                <PartyRow key={link.id}>
                  <CabS.CabDetailPartyRowMain>
                    {brandColor ? <BrandDot $color={brandColor} /> : null}
                    <CabS.CabDetailPartyName title={name}>
                      {name}
                    </CabS.CabDetailPartyName>
                    <InlineRoleSelect
                      value={link.role}
                      disabled={updateRoleMut.isPending}
                      aria-label={`${name} 내각 정당 역할`}
                      onChange={(changeEvent) =>
                        updateRoleMut.mutate({
                          linkId: link.id,
                          role: changeEvent.target.value,
                        })
                      }
                    >
                      {!roleKnown ? (
                        <option value={link.role}>{link.role}</option>
                      ) : null}
                      {CABINET_PARTY_ROLE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </InlineRoleSelect>
                    <CabS.CabDetailPartyRemoveBtn
                      title="연결 해제"
                      disabled={removeMut.isPending}
                      aria-label={`${name} 연결 해제`}
                      onClick={async () => {
                        if (
                          !(await confirm({
                            title: '삭제 확인',
                            message: `「${name}」 정당 연결을 해제할까요?`,
                            danger: true,
                          }))
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
                      {pollLabel ? ` (${pollLabel})` : ''}
                    </CabS.CabDetailPartyNotes>
                  ) : null}
                  {notesText ? (
                    <CabS.CabDetailPartyNotes>{notesText}</CabS.CabDetailPartyNotes>
                  ) : null}
                </PartyRow>
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
