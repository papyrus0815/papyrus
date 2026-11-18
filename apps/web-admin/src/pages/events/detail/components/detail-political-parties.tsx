/**
 * 사건 ↔ 정당(`PoliticalParty`) 연결 섹션 — 「관련 정당」.
 *
 * 혁명·봉기·쿠데타·총파업·연정 위기·창당·해산 사건에서 `Organization` 우회 편법 없이
 * 정본 `PoliticalParty`(당색·이념 스펙트럼·계보·당원 포함)를 진영(`sideId`)과 역할로 직접 연결한다.
 */
import React, { useMemo, useState } from 'react'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FiArrowUpRight, FiFlag, FiPlus, FiX } from 'react-icons/fi'
import { Link } from 'react-router-dom'
import styled from 'styled-components'

import {
  ledgerAccent,
  ledgerAccentBorder,
  ledgerAccentSubtle,
  ledgerHairline,
  ledgerHairlineStrong,
  RADIUS,
} from '@/entities/event/ui/ledger-tokens'
import { metaText } from '@/pages/events/styles/theme'
import { eventKeys } from '@/shared/api/event-query-keys'
import {
  addEventPoliticalParty,
  type EventOrganizationRole,
  type EventPoliticalParty,
  removeEventPoliticalParty,
  type UpdateEventDto,
  updateEventPoliticalParty,
} from '@/shared/api/events'
import {
  POLITICAL_POSITION_COLOR,
  POLITICAL_POSITION_LABEL,
  type PoliticalParty,
  politicalPartyApi,
  type PoliticalPosition,
} from '@/shared/api/political-party'
import { pathKeys } from '@/shared/router'
import { confirm } from '@/shared/ui/confirm-dialog/confirm'
import { SelectModal } from '@/shared/ui/select-modal/select-modal'
import { notify } from '@/shared/ui/toast'
import { PoliticalPartyQuickCreateModal } from '@/widgets/political-party/political-party-quick-create-modal'

import * as S from '../styles'
import { type EventDetail } from '../use-event-detail'
import { InlineSelect, InlineText } from './inline'
import { organizationActiveDuring } from './organization-era.lib'
import { withSideColors } from './side-colors'

interface DetailPoliticalPartiesProps {
  event: EventDetail
  readOnly?: boolean
  onPatch?: (dto: UpdateEventDto) => void
}

const PARTY_ROLE_OPTIONS: Array<{ value: EventOrganizationRole; label: string }> = [
  { value: 'PRINCIPAL', label: '주도·주체' },
  { value: 'PARTICIPANT', label: '참여·가담' },
  { value: 'FOUNDED', label: '이 사건으로 창당' },
  { value: 'DISSOLVED', label: '이 사건으로 해산·불법화' },
  { value: 'BENEFICIARY', label: '수혜·집권' },
  { value: 'VICTIM', label: '탄압·피해' },
  { value: 'OTHER', label: '기타 관여' },
]

const PARTY_ROLE_LABEL: Record<string, string> = Object.fromEntries(
  PARTY_ROLE_OPTIONS.map((opt) => [opt.value, opt.label]),
)

function resolvePartyColor(party: {
  brandColor?: string | null
  position?: string | null
}): string {
  if (party.brandColor && /^#[0-9A-Fa-f]{6}$/.test(party.brandColor)) {
    return party.brandColor
  }
  const pos = party.position as PoliticalPosition | null | undefined
  if (pos && POLITICAL_POSITION_COLOR[pos]) {
    return POLITICAL_POSITION_COLOR[pos]
  }
  return '#64748b'
}

export function DetailPoliticalParties({
  event,
  readOnly = false,
  onPatch,
}: DetailPoliticalPartiesProps) {
  const queryClient = useQueryClient()
  const relations = useMemo(
    () => event.politicalParties ?? [],
    [event.politicalParties],
  )
  const expectPoliticalParties = event.domain === 'POLITICS'

  const [opened, setOpened] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [creatingOpen, setCreatingOpen] = useState(false)
  const [pendingPartyId, setPendingPartyId] = useState<string | null>(null)
  const [partyQuery, setPartyQuery] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)

  const collapsed =
    relations.length === 0 && !expectPoliticalParties && !opened

  const coloredSides = useMemo(
    () => withSideColors(event.sides ?? []),
    [event.sides],
  )
  const sideOptions = useMemo(
    () => coloredSides.map((s) => ({ value: s.id, label: s.name })),
    [coloredSides],
  )

  const participantCountryKeys = useMemo(() => {
    const keys = new Set<string>()
    for (const c of event.relatedCountries ?? []) keys.add(`C:${c.id}`)
    for (const hc of event.relatedHistoricalCountries ?? []) keys.add(`H:${hc.id}`)
    return keys
  }, [event.relatedCountries, event.relatedHistoricalCountries])

  const defaultCountryId = event.relatedCountries?.[0]?.id ?? null
  const defaultHistoricalCountryId =
    event.relatedHistoricalCountries?.[0]?.id ?? null

  const { data: allParties = [], isLoading } = useQuery({
    queryKey: ['political-parties', 'event-link-candidates'],
    queryFn: () => politicalPartyApi.getAll(),
    enabled:
      !collapsed &&
      !readOnly &&
      (pickerOpen ||
        participantCountryKeys.size > 0 ||
        searchFocused ||
        partyQuery.trim().length > 0),
    staleTime: 60_000,
  })

  const linkedPartyIds = useMemo(
    () => new Set(relations.map((rel) => rel.partyId)),
    [relations],
  )

  const recommendedParties = useMemo(() => {
    if (participantCountryKeys.size === 0 || allParties.length === 0) return []
    return allParties
      .filter((party) => {
        if (linkedPartyIds.has(party.id)) return false
        if (
          !organizationActiveDuring(
            {
              foundedDate: party.foundedDate ?? null,
              dissolvedDate: party.dissolvedDate ?? null,
            },
            event,
          )
        ) {
          return false
        }
        const matchC =
          party.countryId && participantCountryKeys.has(`C:${party.countryId}`)
        const matchH =
          party.historicalCountryId &&
          participantCountryKeys.has(`H:${party.historicalCountryId}`)
        return Boolean(matchC || matchH)
      })
      .slice(0, 6)
  }, [allParties, linkedPartyIds, participantCountryKeys, event])

  const quickMatches = useMemo(() => {
    const q = partyQuery.trim().toLowerCase()
    if (!q) return []
    return allParties
      .filter(
        (p) =>
          !linkedPartyIds.has(p.id) &&
          (p.name.toLowerCase().includes(q) ||
            (p.shortName?.toLowerCase().includes(q) ?? false) ||
            (p.localName?.toLowerCase().includes(q) ?? false)),
      )
      .slice(0, 6)
  }, [partyQuery, allParties, linkedPartyIds])

  const selectOptions = useMemo(
    () =>
      allParties
        .map((p: PoliticalParty) => ({
          value: p.id,
          label: p.name,
          description: [
            p.shortName,
            p.historicalCountry?.name ?? p.country?.name ?? null,
            p.position
              ? POLITICAL_POSITION_LABEL[p.position]
              : p.ideology ?? null,
          ]
            .filter(Boolean)
            .join(' · '),
        }))
        .sort((a, b) => a.label.localeCompare(b.label, 'ko')),
    [allParties],
  )

  const refreshEvent = () => {
    void queryClient.invalidateQueries({ queryKey: eventKeys.detail(event.id) })
    void queryClient.invalidateQueries({ queryKey: ['political-parties'] })
  }

  const addMutation = useMutation({
    mutationFn: (input: { partyId: string; role: EventOrganizationRole }) =>
      addEventPoliticalParty(event.id, input),
    onSuccess: () => {
      refreshEvent()
      notify.success('정당을 사건에 연결했습니다.')
    },
    onError: (err) => {
      notify.error(
        err instanceof Error ? err.message : '정당 연결에 실패했습니다.',
      )
    },
  })

  const updateMutation = useMutation({
    mutationFn: (input: {
      relationId: string
      role?: EventOrganizationRole
      roleDescription?: string | null
      sideId?: string | null
    }) =>
      updateEventPoliticalParty(event.id, input.relationId, {
        ...(input.role !== undefined ? { role: input.role } : {}),
        ...(input.roleDescription !== undefined
          ? { roleDescription: input.roleDescription }
          : {}),
        ...(input.sideId !== undefined ? { sideId: input.sideId } : {}),
      }),
    onSuccess: () => {
      refreshEvent()
    },
    onError: (err) => {
      notify.error(
        err instanceof Error ? err.message : '정당 연결 수정에 실패했습니다.',
      )
    },
  })

  const removeMutation = useMutation({
    mutationFn: (relationId: string) =>
      removeEventPoliticalParty(event.id, relationId),
    onSuccess: () => {
      refreshEvent()
      notify.success('정당 연결을 해제했습니다.')
    },
    onError: (err) => {
      notify.error(
        err instanceof Error ? err.message : '정당 연결 해제에 실패했습니다.',
      )
    },
  })

  const handleImportPartyMembers = async (relation: EventPoliticalParty) => {
    if (!onPatch) return
    try {
      const memberships = await politicalPartyApi.getMemberships(
        relation.partyId,
      )
      if (memberships.length === 0) {
        notify.info(`「${relation.name}」에 등록된 소속 당원이 없습니다.`)
        return
      }
      const existingPersons = event.relatedPersons ?? []
      const existingIds = new Set(existingPersons.map((p) => p.personId))
      const nextPersons = existingPersons.map((p) => ({
        personId: p.personId,
        role: p.role ?? undefined,
        note: p.note ?? undefined,
        sideId: p.sideId ?? undefined,
      }))
      let added = 0
      for (const m of memberships) {
        if (!m.personId || existingIds.has(m.personId)) continue
        existingIds.add(m.personId)
        nextPersons.push({
          personId: m.personId,
          role: m.roleTitle ?? `${relation.shortName || relation.name} 당원`,
          note: undefined,
          sideId: relation.sideId ?? undefined,
        })
        added += 1
      }
      if (added > 0) {
        onPatch({ relatedPersons: nextPersons } as UpdateEventDto)
        notify.success(
          `「${relation.name}」 소속 인물 ${added}명을 참여 인물에 반영했습니다.`,
        )
      } else {
        notify.info('이미 모든 소속 당원이 사건 참여 인물에 포함되어 있습니다.')
      }
    } catch (err) {
      notify.error(
        err instanceof Error ? err.message : '당원 목록을 불러오지 못했습니다.',
      )
    }
  }

  const handleRemove = async (relation: EventPoliticalParty) => {
    const ok = await confirm({
      title: '정당 연결 해제',
      message: `「${relation.name}」(${PARTY_ROLE_LABEL[relation.role] ?? relation.role})과 이 사건의 연결만 해제합니다. 정본 정당 데이터는 그대로 유지됩니다.`,
      confirmLabel: '연결 해제',
      danger: true,
    })
    if (ok) removeMutation.mutate(relation.relationId)
  }

  if (readOnly && relations.length === 0) return null

  if (collapsed) {
    return (
      <CollapsedStrip id="political-parties">
        <ActionButton
          type="button"
          onClick={() => setOpened(true)}
          title="혁명·봉기·쿠데타·연정 위기·창당·해산 등으로 이 사건에 관여한 정당을 연결합니다"
        >
          <FiPlus size={14} aria-hidden />
          관련 정당
        </ActionButton>
      </CollapsedStrip>
    )
  }

  return (
    <S.Section id="political-parties">
      <S.SectionHeader>
        <S.SectionTitle>관련 정당</S.SectionTitle>
        {relations.length > 0 && (
          <S.SectionSubtitle>{relations.length}개 정당</S.SectionSubtitle>
        )}
      </S.SectionHeader>

      {relations.length > 0 ? (
        <Rows>
          {relations.map((relation) => {
            const color = resolvePartyColor(relation)
            const polity =
              relation.historicalCountry?.name ?? relation.country?.name ?? null
            const side = relation.sideId
              ? coloredSides.find((s) => s.id === relation.sideId) ?? null
              : null
            const posLabel = relation.position
              ? POLITICAL_POSITION_LABEL[relation.position as PoliticalPosition]
              : null

            return (
              <PartyRowCard key={relation.relationId} $brandColor={color}>
                <RowTopLine>
                  <TitleGroup>
                    <PartyColorDot $color={color} />
                    <PartyLink to={pathKeys.politicalParties.detail(relation.partyId)}>
                      {relation.name}
                      <FiArrowUpRight size={12} />
                    </PartyLink>
                    {relation.shortName && (
                      <MetaBadge>{relation.shortName}</MetaBadge>
                    )}
                    {polity && <MetaBadge>{polity}</MetaBadge>}
                    {posLabel && (
                      <PosBadge $color={color}>{posLabel}</PosBadge>
                    )}
                  </TitleGroup>

                  {!readOnly && (
                    <ControlGroup>
                      {sideOptions.length > 0 && (
                        <SideWrap $color={side?.color ?? null}>
                          <InlineSelect
                            value={relation.sideId ?? ''}
                            options={sideOptions}
                            placeholder="진영 지정"
                            label={`${relation.name} 진영`}
                            onSave={(nextSideId) =>
                              updateMutation.mutate({
                                relationId: relation.relationId,
                                sideId: nextSideId || null,
                              })
                            }
                          />
                        </SideWrap>
                      )}

                      <InlineSelect
                        value={relation.role}
                        options={PARTY_ROLE_OPTIONS}
                        clearable={false}
                        label={`${relation.name} 역할`}
                        onSave={(nextRole) => {
                          if (nextRole) {
                            updateMutation.mutate({
                              relationId: relation.relationId,
                              role: nextRole as EventOrganizationRole,
                            })
                          }
                        }}
                      />

                      {onPatch && (
                        <TinyActionBtn
                          type="button"
                          onClick={() => void handleImportPartyMembers(relation)}
                          title="이 정당 소속 당원을 사건 참여 인물로 불러오기"
                        >
                          당원 불러오기
                        </TinyActionBtn>
                      )}

                      <RemoveBtn
                        type="button"
                        onClick={() => void handleRemove(relation)}
                        aria-label={`${relation.name} 연결 해제`}
                        title="연결 해제"
                      >
                        <FiX size={14} />
                      </RemoveBtn>
                    </ControlGroup>
                  )}
                </RowTopLine>

                {!readOnly ? (
                  <DescLine>
                    <InlineText
                      value={relation.roleDescription ?? ''}
                      placeholder="이 사건에서 정당이 수행한 역할·입장·결과 기록…"
                      label={`${relation.name} 역할 설명`}
                      onSave={(val) =>
                        updateMutation.mutate({
                          relationId: relation.relationId,
                          roleDescription: val || null,
                        })
                      }
                    />
                  </DescLine>
                ) : (
                  relation.roleDescription && (
                    <ReadOnlyDesc>{relation.roleDescription}</ReadOnlyDesc>
                  )
                )}
              </PartyRowCard>
            )
          })}
        </Rows>
      ) : (
        <S.HelperText>
          혁명·봉기·총파업·쿠데타·연정 위기·창당·해산처럼 정당이 주요 행위자인 사건이면 연결하세요. 정당 편람의 계보·당원·선거 기록과 양방향으로 이어집니다.
        </S.HelperText>
      )}

      {!readOnly && recommendedParties.length > 0 && (
        <RecommendBar aria-label="참여국 동시대 정당 빠른 연결">
          <RecommendLabel>참여국 동시대 정당 빠른 연결</RecommendLabel>
          <RecommendChips>
            {recommendedParties.map((party) => (
              <RecommendChipBtn
                key={party.id}
                type="button"
                disabled={addMutation.isPending}
                onClick={() =>
                  addMutation.mutate({
                    partyId: party.id,
                    role: 'PRINCIPAL',
                  })
                }
              >
                <PartyColorDot $color={resolvePartyColor(party)} />
                <strong>{party.name}</strong>
                {party.shortName && <span>({party.shortName})</span>}
                <RecommendPlus>+ 연결</RecommendPlus>
              </RecommendChipBtn>
            ))}
          </RecommendChips>
        </RecommendBar>
      )}

      {!readOnly && (
        <>
          <QuickAddRow>
            <QuickSearchInput
              type="search"
              value={partyQuery}
              onFocus={() => setSearchFocused(true)}
              onChange={(e) => setPartyQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && quickMatches.length > 0) {
                  e.preventDefault()
                  addMutation.mutate({
                    partyId: quickMatches[0].id,
                    role: 'PRINCIPAL',
                  })
                  setPartyQuery('')
                }
              }}
              placeholder="+ 정당 빠른 연결 (당명·약칭 입력 후 Enter)…"
              aria-label="정당 빠른 검색"
            />
            {quickMatches.map((candidate) => (
              <QuickMatchBtn
                key={candidate.id}
                type="button"
                disabled={addMutation.isPending}
                onClick={() => {
                  addMutation.mutate({
                    partyId: candidate.id,
                    role: 'PRINCIPAL',
                  })
                  setPartyQuery('')
                }}
              >
                + {candidate.name}
                {candidate.shortName ? ` (${candidate.shortName})` : ''}
              </QuickMatchBtn>
            ))}
          </QuickAddRow>

          <Actions>
            <ActionButton type="button" onClick={() => setPickerOpen(true)}>
              <FiFlag size={13} aria-hidden />
              정당 연결
            </ActionButton>
            <ActionButton type="button" onClick={() => setCreatingOpen(true)}>
              <FiPlus size={14} aria-hidden />
              새 정당 등록
            </ActionButton>
          </Actions>

          <SelectModal
            isOpen={pickerOpen}
            onClose={() => setPickerOpen(false)}
            title="연결할 정당 선택"
            options={selectOptions}
            isLoading={isLoading}
            searchable
            searchPlaceholder="정당명·약칭 검색 (예: SPD, KPD, 자민당, 민주당)…"
            onSelect={(partyId) => {
              setPickerOpen(false)
              setPendingPartyId(partyId)
            }}
          />

          <SelectModal
            isOpen={pendingPartyId !== null}
            onClose={() => setPendingPartyId(null)}
            title="이 사건에서의 정당 역할"
            options={PARTY_ROLE_OPTIONS}
            onSelect={(role) => {
              const partyId = pendingPartyId
              setPendingPartyId(null)
              if (partyId) {
                addMutation.mutate({
                  partyId,
                  role: role as EventOrganizationRole,
                })
              }
            }}
          />

          {creatingOpen && (
            <PoliticalPartyQuickCreateModal
              defaultCountryId={defaultCountryId}
              defaultHistoricalCountryId={defaultHistoricalCountryId}
              onClose={() => setCreatingOpen(false)}
              onSaved={(saved) => {
                setCreatingOpen(false)
                setPendingPartyId(saved.id)
              }}
            />
          )}
        </>
      )}
    </S.Section>
  )
}

const CollapsedStrip = styled.div`
  display: inline-flex;
`

const Rows = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const PartyRowCard = styled.li<{ $brandColor: string }>`
  padding: 10px 12px;
  border: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  border-left: 3px solid ${({ $brandColor }) => $brandColor};
  border-radius: ${RADIUS.SM};
  background: ${({ theme }) => theme.colors.background.primary};
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const RowTopLine = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
`

const TitleGroup = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
`

const PartyColorDot = styled.span<{ $color: string }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  flex-shrink: 0;
`

const PartyLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 0.875rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  text-decoration: none;

  &:hover {
    color: ${({ theme }) => ledgerAccent(theme.mode)};
    text-decoration: underline;
  }
`

const MetaBadge = styled.span`
  padding: 1px 6px;
  font-size: 0.7rem;
  font-weight: 500;
  border-radius: 4px;
  background: ${({ theme }) => theme.colors.background.secondary};
  color: ${({ theme }) => theme.colors.text.secondary};
  border: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
`

const PosBadge = styled.span<{ $color: string }>`
  padding: 1px 6px;
  font-size: 0.69rem;
  font-weight: 600;
  border-radius: 4px;
  color: ${({ $color }) => $color};
  background: ${({ $color }) => `${$color}16`};
`

const ControlGroup = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
`

const SideWrap = styled.span<{ $color: string | null }>`
  display: inline-flex;
  align-items: center;
  ${({ $color }) =>
    $color
      ? `
    padding-left: 6px;
    border-left: 3px solid ${$color};
  `
      : ''}
`

const TinyActionBtn = styled.button`
  height: 24px;
  padding: 0 8px;
  font-size: 0.71rem;
  font-weight: 500;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: transparent;
  color: ${metaText};
  cursor: pointer;

  &:hover {
    border-color: ${({ theme }) => ledgerAccentBorder(theme.mode)};
    color: ${({ theme }) => ledgerAccent(theme.mode)};
  }
`

const RemoveBtn = styled.button`
  width: 24px;
  height: 24px;
  border: none;
  border-radius: ${RADIUS.SM};
  background: transparent;
  color: ${metaText};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.colors.background.secondary};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const DescLine = styled.div`
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const ReadOnlyDesc = styled.p`
  margin: 0;
  font-size: 0.8125rem;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const RecommendBar = styled.div`
  margin-top: 8px;
  padding: 9px 11px;
  border-radius: ${RADIUS.SM};
  border: 1px dashed ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const RecommendLabel = styled.div`
  font-size: 0.72rem;
  font-weight: 600;
  color: ${metaText};
`

const RecommendChips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`

const RecommendChipBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 27px;
  padding: 0 9px;
  font-size: 0.75rem;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: pointer;

  span {
    color: ${metaText};
    font-size: 0.71rem;
  }

  &:hover {
    border-color: ${({ theme }) => ledgerAccentBorder(theme.mode)};
    background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  }
`

const RecommendPlus = styled.em`
  font-style: normal;
  font-weight: 600;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
`

const QuickAddRow = styled.div`
  margin-top: 8px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
`

const QuickSearchInput = styled.input`
  flex: 1;
  min-width: 220px;
  height: 32px;
  padding: 0 10px;
  font-size: 0.8rem;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme }) => theme.colors.background.primary};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  border-radius: ${RADIUS.SM};

  &:focus {
    outline: none;
    border-color: ${({ theme }) => ledgerAccent(theme.mode)};
  }
`

const QuickMatchBtn = styled.button`
  height: 28px;
  padding: 0 9px;
  font-size: 0.74rem;
  font-weight: 600;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => ledgerAccentBorder(theme.mode)};
  background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  cursor: pointer;
`

const Actions = styled.div`
  margin-top: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`

const ActionButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 11px;
  font-size: 0.78rem;
  font-weight: 500;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;

  &:hover {
    border-color: ${({ theme }) => ledgerAccent(theme.mode)};
    color: ${({ theme }) => ledgerAccent(theme.mode)};
  }
`
