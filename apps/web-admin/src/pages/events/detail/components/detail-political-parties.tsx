/**
 * 사건 ↔ 정당(`PoliticalParty`) 연결 섹션 — 「관련 정당」.
 *
 * 연관 탭 `RelatedLinkModal`과 동일한 2단 잇기 모달(`ActorRelationLinkModal`)로
 * 정당 선택 + 역할·진영·설명을 한 창에서 지정한다.
 */
import { useMemo, useState } from 'react'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FiArrowUpRight, FiEdit2, FiPlus, FiUsers } from 'react-icons/fi'
import { Link } from 'react-router-dom'
import styled from 'styled-components'

import { eventTypeFeatures } from '@/entities/event/model'
import {
  ledgerAccent,
  ledgerHairline,
  ledgerHoverFill,
} from '@/entities/event/ui/ledger-tokens'
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
import { PopoverMenu, type PopoverMenuEntry } from '@/shared/ui/popover-menu'
import { notify } from '@/shared/ui/toast'
import { PoliticalPartyQuickCreateModal } from '@/widgets/political-party/political-party-quick-create-modal'

import * as S from '../styles'
import { type EventDetail } from '../use-event-detail'
import {
  type ActorRelationDraft,
  ActorRelationLinkModal,
  type RelationCandidateItem,
} from './actors/actor-relation-link-modal'
import {
  CollapsedActorChipBtn,
  CollapsedActorInfo,
  CollapsedActorSlot,
  FactTag,
  GhostRowBtn,
  HeaderControlBtn,
  RowControls,
  SectionHintText,
} from './actors/actors.styles'
import { withSideColors } from './side-colors'

interface DetailPoliticalPartiesProps {
  event: EventDetail
  readOnly?: boolean
  displayFilter?: 'expanded-only' | 'collapsed-only'
  onPatch?: (dto: UpdateEventDto) => void
}

const PARTY_ROLE_OPTIONS: Array<{
  value: EventOrganizationRole
  label: string
  hint: string
}> = [
  { value: 'PRINCIPAL', label: '주도·주체', hint: '혁명·쿠데타·연정 등을 주도한 핵심 정당' },
  { value: 'PARTICIPANT', label: '참여·가담', hint: '연정·시위·선거 등에 함께 참여한 정당' },
  { value: 'FOUNDED', label: '창당', hint: '이 사건을 통해 창당·결성된 정당' },
  { value: 'DISSOLVED', label: '해산·불법화', hint: '이 사건으로 해산되거나 불법화된 정당' },
  { value: 'BENEFICIARY', label: '수혜·집권', hint: '이 사건의 결과로 집권하거나 이익을 얻은 정당' },
  { value: 'VICTIM', label: '탄압·피해', hint: '이 사건에서 탄압·숙청·피해를 입은 정당' },
  { value: 'OTHER', label: '기타 관여', hint: '그 밖의 방식으로 사건에 관여한 정당' },
]

const PARTY_ROLE_LABEL: Record<string, string> = Object.fromEntries(
  PARTY_ROLE_OPTIONS.map((option) => [option.value, option.label]),
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
  displayFilter,
  onPatch,
}: DetailPoliticalPartiesProps) {
  const queryClient = useQueryClient()
  const relations = useMemo(
    () => event.politicalParties ?? [],
    [event.politicalParties],
  )
  const expectPoliticalParties = eventTypeFeatures(event.type, event.domain).expectPoliticalParties

  const [linkModalOpen, setLinkModalOpen] = useState(false)
  const [initialDraft, setInitialDraft] = useState<ActorRelationDraft | null>(null)
  const [creatingOpen, setCreatingOpen] = useState(false)

  const collapsed = relations.length === 0 && !expectPoliticalParties

  const coloredSides = useMemo(
    () => withSideColors(event.sides ?? []),
    [event.sides],
  )
  const modalSideOptions = useMemo(
    () =>
      coloredSides.length === 0
        ? []
        : [
            { value: 'none', label: '진영 미지정' },
            ...coloredSides.map((side) => ({
              value: side.id,
              label: side.name,
              color: side.color,
            })),
          ],
    [coloredSides],
  )

  const defaultCountryId = event.relatedCountries?.[0]?.id ?? null
  const defaultHistoricalCountryId =
    event.relatedHistoricalCountries?.[0]?.id ?? null

  const {
    data: allParties = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['political-parties', 'event-link-candidates'],
    queryFn: () => politicalPartyApi.getAll(),
    enabled: linkModalOpen && !readOnly,
    staleTime: 60_000,
  })

  const existingByPartyId = useMemo(
    () => new Map(relations.map((rel) => [rel.partyId, rel])),
    [relations],
  )

  const modalCandidates = useMemo<RelationCandidateItem[]>(
    () =>
      allParties
        .slice()
        .sort((left, right) => left.name.localeCompare(right.name, 'ko'))
        .map((partyItem: PoliticalParty) => {
          const existing = existingByPartyId.get(partyItem.id)
          return {
            key: partyItem.id,
            name: partyItem.name,
            shortName: partyItem.shortName ?? null,
            logoUrl: partyItem.logoUrl ?? null,
            metaText:
              [
                partyItem.historicalCountry?.name ?? partyItem.country?.name ?? null,
                partyItem.position
                  ? POLITICAL_POSITION_LABEL[partyItem.position]
                  : partyItem.ideology ?? null,
              ]
                .filter(Boolean)
                .join(' · ') || null,
            detailHref: pathKeys.politicalParties.detail(partyItem.id),
            existing: existing
              ? {
                  relationId: existing.relationId,
                  role: existing.role,
                  sideId: existing.sideId ?? null,
                  roleDescription: existing.roleDescription ?? null,
                }
              : undefined,
          }
        }),
    [allParties, existingByPartyId],
  )

  const refreshEvent = () => {
    void queryClient.invalidateQueries({ queryKey: eventKeys.detail(event.id) })
    void queryClient.invalidateQueries({ queryKey: ['political-parties'] })
  }

  const saveModalMutation = useMutation({
    mutationFn: async (draft: ActorRelationDraft) => {
      const nextRole = draft.role as EventOrganizationRole
      const nextSideId = draft.sideId === 'none' ? null : draft.sideId
      const nextDesc = draft.roleDescription.trim() || null

      if (draft.relationId) {
        const updated = await updateEventPoliticalParty(event.id, draft.relationId, {
          role: nextRole,
          sideId: nextSideId,
          roleDescription: nextDesc,
        })
        return updated.relationId
      }
      const created = await addEventPoliticalParty(event.id, {
        partyId: draft.candidateKey,
        role: nextRole,
        sideId: nextSideId,
        roleDescription: nextDesc,
      })
      return created.relationId
    },
    onSuccess: (_savedId, draft) => {
      refreshEvent()
      notify.success(
        draft.relationId ? '정당 참여 내용을 수정했습니다.' : '정당을 사건에 연결했습니다.',
      )
    },
    onError: (err) => {
      notify.error(
        err instanceof Error ? err.message : '정당 연결 저장에 실패했습니다.',
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
    onSuccess: refreshEvent,
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
      const existingIds = new Set(existingPersons.map((person) => person.personId))
      const nextPersons = existingPersons.map((person) => ({
        personId: person.personId,
        role: person.role ?? undefined,
        note: person.note ?? undefined,
        sideId: person.sideId ?? undefined,
      }))
      let added = 0
      for (const membership of memberships) {
        if (!membership.personId || existingIds.has(membership.personId)) continue
        existingIds.add(membership.personId)
        nextPersons.push({
          personId: membership.personId,
          role: membership.roleTitle ?? `${relation.shortName || relation.name} 당원`,
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

  const openEditRelation = (relation: EventPoliticalParty) => {
    const polity = relation.historicalCountry?.name ?? relation.country?.name ?? null
    const posLabel = relation.position
      ? POLITICAL_POSITION_LABEL[relation.position as PoliticalPosition]
      : null
    setInitialDraft({
      relationId: relation.relationId,
      candidateKey: relation.partyId,
      name: relation.name,
      metaText: [polity, posLabel].filter(Boolean).join(' · ') || null,
      detailHref: pathKeys.politicalParties.detail(relation.partyId),
      role: relation.role,
      sideId: relation.sideId ?? 'none',
      roleDescription: relation.roleDescription ?? '',
    })
    setLinkModalOpen(true)
  }

  const closeLinkModal = () => {
    setLinkModalOpen(false)
    setInitialDraft(null)
  }

  const modalsNode = !readOnly && (
    <>
      <ActorRelationLinkModal
        isOpen={linkModalOpen && !creatingOpen}
        onClose={closeLinkModal}
        title="관련 정당 잇기"
        nounLabel="정당"
        eventTitle={event.title}
        searchPlaceholder="정당명 · 약칭 · 원어명으로 찾기"
        candidates={modalCandidates}
        roleOptions={PARTY_ROLE_OPTIONS}
        defaultRole="PRINCIPAL"
        sideOptions={modalSideOptions}
        loading={isLoading}
        failed={isError}
        saving={saveModalMutation.isPending}
        onRetry={() => void refetch()}
        initialDraft={initialDraft}
        createLabel="새 정당"
        onCreateNew={() => setCreatingOpen(true)}
        onSave={async (draft) => saveModalMutation.mutateAsync(draft)}
        onDelete={async (relationId) => {
          await removeMutation.mutateAsync(relationId)
        }}
      />

      {creatingOpen && (
        <PoliticalPartyQuickCreateModal
          defaultCountryId={defaultCountryId}
          defaultHistoricalCountryId={defaultHistoricalCountryId}
          onClose={() => setCreatingOpen(false)}
          onSaved={(saved) => {
            setCreatingOpen(false)
            void queryClient.invalidateQueries({ queryKey: ['political-parties'] })
            setInitialDraft({
              candidateKey: saved.id,
              name: saved.name,
              detailHref: pathKeys.politicalParties.detail(saved.id),
              role: 'PRINCIPAL',
              sideId: 'none',
              roleDescription: '',
            })
            setLinkModalOpen(true)
          }}
        />
      )}
    </>
  )

  if (readOnly && relations.length === 0) return null

  if (collapsed) {
    if (displayFilter === 'expanded-only') return null
    return (
      <CollapsedActorSlot id="political-parties">
        <CollapsedActorInfo>
          <strong>관련 정당</strong>
          <span>혁명·선거·연정·쿠데타·창당·해산 등에 관여한 정당</span>
        </CollapsedActorInfo>
        <CollapsedActorChipBtn
          type="button"
          onClick={() => {
            setInitialDraft(null)
            setLinkModalOpen(true)
          }}
        >
          <FiPlus size={13} aria-hidden />
          <span>정당 잇기</span>
        </CollapsedActorChipBtn>
        {modalsNode}
      </CollapsedActorSlot>
    )
  }

  if (displayFilter === 'collapsed-only') return null

  return (
    <S.Section id="political-parties">
      <S.SectionHeader>
        <S.SectionTitle>관련 정당</S.SectionTitle>
        {relations.length > 0 && (
          <S.SectionSubtitle>{relations.length}개 정당</S.SectionSubtitle>
        )}
        {!readOnly && (
          <S.SectionActions>
            <HeaderControlBtn
              type="button"
              onClick={() => {
                setInitialDraft(null)
                setLinkModalOpen(true)
              }}
            >
              <FiPlus aria-hidden />
              정당 잇기
            </HeaderControlBtn>
          </S.SectionActions>
        )}
      </S.SectionHeader>
      <SectionLeadWrap>
        <SectionHintText>
          사건을 주도·참여했거나 이 사건으로 창당·해산된 정당과 그 입장을 기록합니다.
        </SectionHintText>
      </SectionLeadWrap>

      {relations.length > 0 ? (
        <Rows>
          {relations.map((relation) => {
            const color = resolvePartyColor(relation)
            const polity =
              relation.historicalCountry?.name ?? relation.country?.name ?? null
            const side = relation.sideId
              ? coloredSides.find((sideItem) => sideItem.id === relation.sideId) ?? null
              : null
            const posLabel = relation.position
              ? POLITICAL_POSITION_LABEL[relation.position as PoliticalPosition]
              : null

            const menuItems: PopoverMenuEntry[] = [
              {
                id: 'edit',
                label: '편집 (역할 · 진영 · 설명)',
                icon: <FiEdit2 size={13} />,
                onSelect: () => openEditRelation(relation),
              },
              ...(onPatch
                ? ([
                    {
                      id: 'import-members',
                      label: '소속 당원을 참여 인물로 불러오기',
                      icon: <FiUsers size={13} />,
                      onSelect: () => void handleImportPartyMembers(relation),
                    },
                  ] as PopoverMenuEntry[])
                : []),
              { type: 'divider', id: 'div-role' },
              { type: 'section', id: 'sec-role', label: '정당 역할 변경' },
              ...PARTY_ROLE_OPTIONS.map((option) => ({
                id: `role-${option.value}`,
                label: option.label,
                checked: option.value === relation.role,
                onSelect: () => {
                  if (option.value !== relation.role) {
                    updateMutation.mutate({
                      relationId: relation.relationId,
                      role: option.value,
                    })
                  }
                },
              })),
              ...(modalSideOptions.length > 1
                ? ([
                    { type: 'divider', id: 'div-side' },
                    { type: 'section', id: 'sec-side', label: '진영 배정' },
                    ...modalSideOptions.map((option) => ({
                      id: `side-${option.value}`,
                      label: option.label,
                      checked: option.value === (relation.sideId ?? 'none'),
                      onSelect: () =>
                        updateMutation.mutate({
                          relationId: relation.relationId,
                          sideId: option.value === 'none' ? null : option.value,
                        }),
                    })),
                  ] as PopoverMenuEntry[])
                : []),
              { type: 'divider', id: 'div-rm' },
              {
                id: 'remove',
                label: '정당 연결 해제',
                danger: true,
                onSelect: () => void handleRemove(relation),
              },
            ]

            return (
              <PartyLedgerRow key={relation.relationId} $brandColor={color}>
                <RowTopLine>
                  <TitleGroup>
                    <PartyColorDot $color={color} />
                    <PartyLink to={pathKeys.politicalParties.detail(relation.partyId)}>
                      {relation.name}
                      <FiArrowUpRight size={12} />
                    </PartyLink>
                    <FactTag>{PARTY_ROLE_LABEL[relation.role] ?? relation.role}</FactTag>
                    {side && <FactTag $color={side.color}>{side.name}</FactTag>}
                    {relation.shortName && (
                      <MetaBadge>{relation.shortName}</MetaBadge>
                    )}
                    {polity && <MetaBadge>{polity}</MetaBadge>}
                    {posLabel && (
                      <PosBadge $color={color}>{posLabel}</PosBadge>
                    )}
                  </TitleGroup>

                  {!readOnly && (
                    <RowControls>
                      <GhostRowBtn
                        type="button"
                        onClick={() => openEditRelation(relation)}
                        title={`${relation.name} 역할 · 설명 편집`}
                      >
                        <FiEdit2 aria-hidden />
                        <span>편집</span>
                      </GhostRowBtn>
                      <PopoverMenu
                        size="sm"
                        items={menuItems}
                        ariaLabel={`${relation.name} 더보기 메뉴`}
                      />
                    </RowControls>
                  )}
                </RowTopLine>

                {relation.roleDescription && (
                  <ReadOnlyDesc>{relation.roleDescription}</ReadOnlyDesc>
                )}
              </PartyLedgerRow>
            )
          })}
        </Rows>
      ) : (
        <S.HelperText>
          아직 연결된 정당이 없습니다 — 우측 ‘정당 잇기’로 기존 정당을 찾거나 새 정당을 등록해 연결하세요.
        </S.HelperText>
      )}

      {modalsNode}
    </S.Section>
  )
}

const SectionLeadWrap = styled.div`
  margin: -4px 0 10px;
`

const Rows = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  border-top: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
`

const PartyLedgerRow = styled.li<{ $brandColor: string }>`
  padding: 10px 4px 10px 10px;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  border-left: 3px solid ${({ $brandColor }) => $brandColor};
  display: flex;
  flex-direction: column;
  gap: 5px;

  &:hover {
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
  }
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
  font-weight: 650;
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
`

const PosBadge = styled.span<{ $color: string }>`
  padding: 1px 6px;
  font-size: 0.69rem;
  font-weight: 600;
  border-radius: 4px;
  color: ${({ $color }) => $color};
  background: ${({ $color }) => `${$color}16`};
`

const ReadOnlyDesc = styled.p`
  margin: 0;
  font-size: 0.8125rem;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.text.secondary};
`
