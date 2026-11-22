/**
 * 선거 연합·블록 — 정당 집계 탭 안의 「선거 연합」 묶음과 등록·수정 모달.
 *
 * '연합'은 세 가지 뜻이 있고 이 파일은 셋째만 다룬다.
 *  · 연립정부(연정) → 행정부·내각의 정당 연결(CabinetPoliticalParty: 주도 여당 / 연정 파트너)
 *  · 합당 → 정당 계보(PoliticalPartyTransition MERGER_INTO)
 *  · 선거 연합 → 여기. 각 정당이 따로 출마하되 하나로 묶여 싸운 연합(1907 뷜로 블록, 후보 단일화 연대).
 *    선거마다 새로 꾸려지므로 선거에 붙이고, 소속은 그 선거 정당 집계 행의 allianceId.
 * 공동 명부 하나로 한 정당처럼 득표했다면 연합이 아니라 정당으로 등록한다(모달 안내).
 */
import React, { useMemo, useState } from 'react'

import { FiEdit2, FiTrash2 } from 'react-icons/fi'
import styled from 'styled-components'

import * as EventFormS from '@/pages/events/create/event-create.styles'
import { DIGIT_DISPLAY, ledgerHairline } from '@/entities/event/ui/ledger-tokens'
import type { ElectionAllianceDto, ElectionAllianceInput, ElectionPartyResultDto } from '@/shared/api/election'
import { RegisterModal } from '@/shared/ui/register-modal-shell/register-modal'
import {
  PersonRegisterModalCancelBtn,
  PersonRegisterModalFormScroll,
  PersonRegisterModalPrimaryBtn,
  PersonRegisterModalStickyFooter,
} from '@/shared/ui/register-modal-shell/register-modal-shell'

import * as FormS from './military-unit-form/styles'

export interface AlliancePartyInfo {
  name: string
  fill: string
}

export interface AllianceSummary {
  alliance: ElectionAllianceDto
  fill: string
  members: ElectionPartyResultDto[]
  seats: number | null
  voteShare: number | null
}

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/

/** 연합 색이 없으면 의석(없으면 득표율)이 가장 큰 소속 정당 색 */
export function summarizeAlliances(
  alliances: ElectionAllianceDto[],
  partyResults: ElectionPartyResultDto[],
  partyInfo: (partyId: string) => AlliancePartyInfo,
  neutralFill: string,
): AllianceSummary[] {
  return alliances.map((alliance) => {
    const members = partyResults.filter((row) => row.allianceId === alliance.id)
    const ranked = [...members].sort(
      (left, right) =>
        (right.seatsWon ?? 0) - (left.seatsWon ?? 0) ||
        (Number(right.voteSharePercent) || 0) - (Number(left.voteSharePercent) || 0),
    )
    const seatsKnown = members.filter((row) => row.seatsWon != null)
    const shareKnown = members.filter((row) => Number.isFinite(Number(row.voteSharePercent)) && row.voteSharePercent != null)
    const fill =
      alliance.color && HEX_COLOR.test(alliance.color)
        ? alliance.color
        : ranked[0]
          ? partyInfo(ranked[0].partyId).fill
          : neutralFill
    return {
      alliance,
      fill,
      members: ranked,
      seats: seatsKnown.length > 0 ? seatsKnown.reduce((sum, row) => sum + (row.seatsWon ?? 0), 0) : null,
      voteShare:
        shareKnown.length > 0 ? shareKnown.reduce((sum, row) => sum + Number(row.voteSharePercent), 0) : null,
    }
  })
}

export function ElectionAlliancesPanel({
  summaries,
  totalSeats,
  partyInfo,
  onEdit,
  onDelete,
  onSelectParty,
}: {
  summaries: AllianceSummary[]
  totalSeats: number | null
  partyInfo: (partyId: string) => AlliancePartyInfo
  onEdit: (alliance: ElectionAllianceDto) => void
  onDelete: (alliance: ElectionAllianceDto) => void
  onSelectParty: (partyId: string) => void
}) {
  if (summaries.length === 0) return null
  const majority = totalSeats != null && totalSeats > 0 ? Math.floor(totalSeats / 2) + 1 : null
  return (
    <AllianceList aria-label="선거 연합">
      {summaries.map((summary) => {
        const { alliance, fill, members, seats, voteShare } = summary
        const reached = majority != null && seats != null ? seats >= majority : null
        return (
          <AllianceCard key={alliance.id} style={{ borderLeftColor: fill }}>
            <AllianceHead>
              <span className="name">{alliance.name}</span>
              {alliance.shortName && alliance.shortName.trim() !== alliance.name.trim() ? (
                <span className="short">{alliance.shortName}</span>
              ) : null}
              <span className="stat">
                {[
                  seats != null ? `${seats.toLocaleString('ko-KR')}석` : null,
                  voteShare != null ? `${voteShare.toFixed(1)}%` : null,
                  `${members.length}개 정당`,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
              {reached != null ? (
                <MajorityBadge $reached={reached}>
                  {reached ? '과반' : `과반까지 ${(majority! - (seats ?? 0)).toLocaleString('ko-KR')}석`}
                </MajorityBadge>
              ) : null}
              <span className="actions">
                <IconBtn type="button" onClick={() => onEdit(alliance)} aria-label={`${alliance.name} 수정`}>
                  <FiEdit2 size={13} aria-hidden />
                </IconBtn>
                <IconBtn type="button" onClick={() => onDelete(alliance)} aria-label={`${alliance.name} 삭제`}>
                  <FiTrash2 size={13} aria-hidden />
                </IconBtn>
              </span>
            </AllianceHead>
            {members.length > 0 ? (
              <MemberChips>
                {members.map((row) => {
                  const info = partyInfo(row.partyId)
                  return (
                    <MemberChip key={row.partyId} type="button" onClick={() => onSelectParty(row.partyId)}>
                      <span className="sw" style={{ background: info.fill }} aria-hidden />
                      {info.name}
                      {row.seatsWon != null ? <span className="seats">{row.seatsWon}</span> : null}
                    </MemberChip>
                  )
                })}
              </MemberChips>
            ) : (
              <EmptyMembers>소속 정당 없음 — 수정에서 정당을 넣으세요.</EmptyMembers>
            )}
            {alliance.notes ? <AllianceNotes>{alliance.notes}</AllianceNotes> : null}
          </AllianceCard>
        )
      })}
    </AllianceList>
  )
}

export function ElectionAllianceFormModal({
  mode,
  initial,
  alliances,
  partyResults,
  partyInfo,
  saving,
  onClose,
  onSubmit,
}: {
  mode: 'create' | 'edit'
  initial?: ElectionAllianceDto
  alliances: ElectionAllianceDto[]
  partyResults: ElectionPartyResultDto[]
  partyInfo: (partyId: string) => AlliancePartyInfo
  saving: boolean
  onClose: () => void
  onSubmit: (body: ElectionAllianceInput) => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [shortName, setShortName] = useState(initial?.shortName ?? '')
  const [color, setColor] = useState(initial?.color ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [memberIds, setMemberIds] = useState<Set<string>>(
    () =>
      new Set(
        initial ? partyResults.filter((row) => row.allianceId === initial.id).map((row) => row.partyId) : [],
      ),
  )

  const allianceNameById = useMemo(
    () => new Map(alliances.map((alliance) => [alliance.id, alliance.name])),
    [alliances],
  )
  const sortedRows = useMemo(
    () =>
      [...partyResults].sort(
        (left, right) =>
          (right.seatsWon ?? 0) - (left.seatsWon ?? 0) ||
          (Number(right.voteSharePercent) || 0) - (Number(left.voteSharePercent) || 0),
      ),
    [partyResults],
  )
  const selectedSeats = sortedRows
    .filter((row) => memberIds.has(row.partyId))
    .reduce((sum, row) => sum + (row.seatsWon ?? 0), 0)

  const trimmedName = name.trim()
  const duplicate = alliances.some(
    (alliance) => alliance.id !== initial?.id && alliance.name.trim() === trimmedName,
  )
  const colorValid = color.trim() === '' || HEX_COLOR.test(color.trim())
  const canSubmit = trimmedName !== '' && !duplicate && colorValid && !saving

  const toggleMember = (partyId: string) => {
    setMemberIds((prev) => {
      const next = new Set(prev)
      if (next.has(partyId)) next.delete(partyId)
      else next.add(partyId)
      return next
    })
  }

  const handleSubmit = () => {
    if (!canSubmit) return
    onSubmit({
      name: trimmedName,
      shortName: shortName.trim() || null,
      color: color.trim() || null,
      notes: notes.trim() || null,
      memberPartyIds: [...memberIds],
    })
  }

  const statusText = !trimmedName
    ? '필수: 연합 명칭'
    : duplicate
      ? '이 선거에 같은 이름의 연합이 있습니다.'
      : !colorValid
        ? '색은 #RRGGBB 형식'
        : memberIds.size > 0
          ? `${memberIds.size}개 정당 · ${selectedSeats.toLocaleString('ko-KR')}석`
          : '소속 정당은 나중에 넣어도 됩니다.'

  return (
    <RegisterModal
      isOpen
      onClose={onClose}
      trapFocus={false}
      title={mode === 'create' ? '선거 연합 추가' : '선거 연합 수정'}
      maxWidth="min(720px, 96vw)"
    >
      <PersonRegisterModalFormScroll>
        <FormS.FormGroupSection aria-labelledby="election-alliance-basic-title">
          <FormS.FormGroupTitle id="election-alliance-basic-title">연합</FormS.FormGroupTitle>
          <EventFormS.FormRow>
            <EventFormS.FormLabel htmlFor="election-alliance-name">
              명칭 <EventFormS.Required>*</EventFormS.Required>
            </EventFormS.FormLabel>
            <EventFormS.FormField>
              <FormS.TitleInput
                id="election-alliance-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="off"
                aria-required
                aria-invalid={duplicate || undefined}
                placeholder="예: 뷜로 블록"
                autoFocus
              />
            </EventFormS.FormField>
          </EventFormS.FormRow>
          <EventFormS.FormRow>
            <EventFormS.FormLabel htmlFor="election-alliance-short">
              짧은 표기<FormS.OptionalTag>(선택)</FormS.OptionalTag>
            </EventFormS.FormLabel>
            <EventFormS.FormField>
              <EventFormS.Input
                id="election-alliance-short"
                value={shortName}
                onChange={(event) => setShortName(event.target.value)}
                autoComplete="off"
              />
            </EventFormS.FormField>
          </EventFormS.FormRow>
          <EventFormS.FormRow>
            <EventFormS.FormLabel htmlFor="election-alliance-color">
              색<FormS.OptionalTag>(선택)</FormS.OptionalTag>
            </EventFormS.FormLabel>
            <EventFormS.FormField>
              <ColorRow>
                <input
                  type="color"
                  aria-label="연합 색 고르기"
                  value={HEX_COLOR.test(color.trim()) ? color.trim() : '#64748B'}
                  onChange={(event) => setColor(event.target.value.toUpperCase())}
                />
                <EventFormS.Input
                  id="election-alliance-color"
                  value={color}
                  onChange={(event) => setColor(event.target.value)}
                  placeholder="비우면 가장 큰 소속 정당 색"
                  autoComplete="off"
                  aria-invalid={!colorValid || undefined}
                />
              </ColorRow>
            </EventFormS.FormField>
          </EventFormS.FormRow>
        </FormS.FormGroupSection>

        <FormS.FormGroupSection aria-labelledby="election-alliance-members-title">
          <FormS.FormGroupTitle id="election-alliance-members-title">소속 정당</FormS.FormGroupTitle>
          <MembersHint>
            이 선거에 정당 집계가 있는 정당만 넣을 수 있습니다. 다른 연합에 있던 정당을 고르면 이 연합으로 옮겨집니다.
            공동 명부 하나로 한 정당처럼 득표했다면 연합 대신 정당으로 등록하세요.
          </MembersHint>
          {sortedRows.length === 0 ? (
            <MembersHint>정당 집계가 아직 없습니다 — 연합만 먼저 만들고, 집계를 넣은 뒤 소속을 채워도 됩니다.</MembersHint>
          ) : (
            <MemberChecklist role="group" aria-label="소속 정당 선택">
              {sortedRows.map((row) => {
                const info = partyInfo(row.partyId)
                const checked = memberIds.has(row.partyId)
                const otherAlliance =
                  row.allianceId && row.allianceId !== initial?.id ? allianceNameById.get(row.allianceId) : null
                return (
                  <MemberOption key={row.partyId} $checked={checked}>
                    <input type="checkbox" checked={checked} onChange={() => toggleMember(row.partyId)} />
                    <span className="sw" style={{ background: info.fill }} aria-hidden />
                    <span className="name">{info.name}</span>
                    {otherAlliance ? (
                      <span className="moved">{checked ? `${otherAlliance}에서 옮김` : otherAlliance}</span>
                    ) : null}
                    <span className="stat">
                      {[
                        row.seatsWon != null ? `${row.seatsWon}석` : null,
                        row.voteSharePercent != null && Number.isFinite(Number(row.voteSharePercent))
                          ? `${Number(row.voteSharePercent).toFixed(1)}%`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(' · ') || '—'}
                    </span>
                  </MemberOption>
                )
              })}
            </MemberChecklist>
          )}
        </FormS.FormGroupSection>

        <FormS.FormGroupSection aria-labelledby="election-alliance-notes-title">
          <FormS.FormGroupTitle id="election-alliance-notes-title">메모</FormS.FormGroupTitle>
          <EventFormS.FormRow>
            <EventFormS.FormLabel htmlFor="election-alliance-notes">
              설명<FormS.OptionalTag>(선택)</FormS.OptionalTag>
            </EventFormS.FormLabel>
            <EventFormS.FormField>
              <EventFormS.Textarea
                id="election-alliance-notes"
                rows={3}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="결성 배경·후보 단일화 방식 등"
              />
            </EventFormS.FormField>
          </EventFormS.FormRow>
        </FormS.FormGroupSection>
      </PersonRegisterModalFormScroll>
      <PersonRegisterModalStickyFooter>
        <FooterRow>
          <FooterStatus $error={duplicate || !colorValid}>{statusText}</FooterStatus>
          <PersonRegisterModalCancelBtn type="button" onClick={onClose} disabled={saving}>
            취소
          </PersonRegisterModalCancelBtn>
          <PersonRegisterModalPrimaryBtn type="button" disabled={!canSubmit} onClick={handleSubmit}>
            {saving ? '저장 중…' : '저장'}
          </PersonRegisterModalPrimaryBtn>
        </FooterRow>
      </PersonRegisterModalStickyFooter>
    </RegisterModal>
  )
}

const AllianceList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 8px;
  margin-bottom: 14px;
`

const AllianceCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px;
  border: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  border-left-width: 3px;
  border-radius: 10px;
  color: ${({ theme }) => theme.colors.text.primary};
`

const AllianceHead = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 8px;

  .name {
    font-size: 14px;
    font-weight: 800;
    color: ${({ theme }) => theme.colors.text.primary};
  }
  .short {
    font-size: 12px;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
  .stat {
    font-size: 12px;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text.secondary};
    ${DIGIT_DISPLAY}
  }
  .actions {
    margin-left: auto;
    display: inline-flex;
    gap: 2px;
  }
`

const MajorityBadge = styled.span<{ $reached: boolean }>`
  padding: 1px 7px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme, $reached }) => ($reached ? theme.colors.primary : theme.colors.text.tertiary)};
  border: 1px solid ${({ theme, $reached }) => ($reached ? theme.colors.primary : ledgerHairline(theme.mode))};
`

const IconBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.05)')};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
  }
`

const MemberChips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
`

const MemberChip = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 8px;
  border: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  border-radius: 999px;
  background: transparent;
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: pointer;

  .sw {
    width: 8px;
    height: 8px;
    border-radius: 2px;
  }
  .seats {
    color: ${({ theme }) => theme.colors.text.tertiary};
    ${DIGIT_DISPLAY}
  }
  &:hover {
    background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.04)')};
  }
`

const EmptyMembers = styled.p`
  margin: 0;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const AllianceNotes = styled.p`
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  white-space: pre-wrap;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const ColorRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;

  input[type='color'] {
    flex: none;
    width: 38px;
    height: 34px;
    padding: 2px;
    border: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
    border-radius: 8px;
    background: transparent;
    cursor: pointer;
  }
`

const MembersHint = styled.p`
  margin: 0 0 10px;
  font-size: 12.5px;
  line-height: 1.55;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const MemberChecklist = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`

const MemberOption = styled.label<{ $checked: boolean }>`
  display: grid;
  grid-template-columns: 16px 10px minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 8px;
  min-height: 34px;
  padding: 4px 8px;
  border-radius: 8px;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme, $checked }) =>
    $checked ? (theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.045)') : 'transparent'};

  .sw {
    width: 10px;
    height: 10px;
    border-radius: 3px;
  }
  .name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 13px;
    font-weight: 600;
  }
  .moved {
    font-size: 11px;
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
  .stat {
    font-size: 12px;
    color: ${({ theme }) => theme.colors.text.secondary};
    ${DIGIT_DISPLAY}
  }
`

const FooterRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
`

const FooterStatus = styled.span<{ $error: boolean }>`
  margin-right: auto;
  font-size: 12.5px;
  color: ${({ theme, $error }) => ($error ? theme.colors.error : theme.colors.text.tertiary)};
`
