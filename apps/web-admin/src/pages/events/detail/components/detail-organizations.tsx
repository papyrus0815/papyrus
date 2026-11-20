/**
 * 사건 ↔ 기구·협의체·조직(`!relation.companyId`) 및 기업(`Boolean(relation.companyId)`) 분리 섹션.
 *
 * 연관 탭 `RelatedLinkModal`과 동일한 2단 잇기 모달(`ActorRelationLinkModal`)로
 * 기구/기업 선택 + 역할·진영·설명을 한 창에서 지정한다.
 */
import React, { lazy, Suspense, useMemo, useState } from 'react'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FiExternalLink, FiPlus, FiX } from 'react-icons/fi'
import { Link } from 'react-router-dom'
import styled from 'styled-components'

import {
  type EventCountryParticipant,
  participantKey,
  toParticipants,
} from '@/entities/event/model/country-participant'
import {
  ledgerAccentBorder,
  ledgerHairline,
  ledgerHairlineStrong,
  ledgerHoverFill,
  RADIUS,
} from '@/entities/event/ui/ledger-tokens'
import { ORGANIZATION_ROLE_OPTIONS as ROLE_OPTIONS } from '@/features/event-facets/model/organization-roles'
import { metaText, toolbarControlHeight } from '@/pages/events/styles/theme'
import { getApiConnection } from '@/shared/api/client'
import { eventKeys } from '@/shared/api/event-query-keys'
import {
  addEventOrganization,
  type EventOrganization,
  type EventOrganizationRole,
  removeEventOrganization,
  type UpdateEventDto,
  updateEventOrganization,
} from '@/shared/api/events'
import {
  getOrganizationCountryMemberships,
  getOrganizationMembers,
  getOrganizations,
  isOrganizationMembershipActiveAtYear,
  ORGANIZATION_TYPE_LABEL,
  resolveOrganizationMembershipRoleAtYear,
} from '@/shared/api/organizations'
import { signedYearFromIsoLike } from '@/shared/lib/country-period'
import { pathKeys } from '@/shared/router'
import { confirm } from '@/shared/ui/confirm-dialog/confirm'
import { notify } from '@/shared/ui/toast'
import { OrganizationQuickCreateModal } from '@/widgets/organization/organization-quick-create-modal'

const LazyCompanyRegisterModal = lazy(() =>
  import('@/widgets/company-form').then((moduleRef) => ({
    default: moduleRef.CompanyRegisterModal,
  })),
)

import * as S from '../styles'
import { type EventDetail } from '../use-event-detail'
import {
  type ActorRelationDraft,
  ActorRelationLinkModal,
  type RelationCandidateItem,
} from './actors/actor-relation-link-modal'
import {
  CollapsedActorChipBtn,
  CollapsedActorSlot,
} from './actors/actors.styles'
import { InlineSelect } from './inline'
import { withSideColors } from './side-colors'

interface DetailOrganizationsProps {
  event: EventDetail
  expectOrganizations: boolean
  onPatch?: (dto: UpdateEventDto) => void
}

const ROLE_LABEL = Object.fromEntries(
  ROLE_OPTIONS.map((option) => [option.value, option.label]),
) as Record<EventOrganizationRole, string>

const ORG_ROLE_ITEMS = ROLE_OPTIONS.map((option) => ({
  value: option.value,
  label: option.label,
  hint: option.description,
}))

function formatCompactMoney(
  raw: string | null,
  currency: string | null,
): string | null {
  if (raw == null) return null
  const value = Number(raw)
  if (!Number.isFinite(value)) return null
  const compact = new Intl.NumberFormat('ko-KR', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)
  return currency ? `${compact} ${currency}` : compact
}

function formatPrice(
  raw: string | null,
  currency: string | null,
): string | null {
  if (raw == null) return null
  const value = Number(raw)
  if (!Number.isFinite(value)) return null
  const text = new Intl.NumberFormat('ko-KR', {
    maximumFractionDigits: 2,
  }).format(value)
  return currency ? `${text} ${currency}` : text
}

export function DetailOrganizations({
  event,
  expectOrganizations,
  onPatch,
}: DetailOrganizationsProps) {
  const allLinked = useMemo(
    () => event.organizations ?? [],
    [event.organizations],
  )
  const institutionRelations = useMemo(
    () => allLinked.filter((rel) => !rel.companyId),
    [allLinked],
  )
  const companyRelations = useMemo(
    () => allLinked.filter((rel) => Boolean(rel.companyId)),
    [allLinked],
  )

  const expectInstitutions =
    event.type === 'SUMMIT' ||
    event.type === 'INSTITUTION' ||
    (expectOrganizations && event.type !== 'COMPANY' && event.type !== 'PRODUCT')

  const expectCompanies =
    event.type === 'COMPANY' ||
    event.type === 'PRODUCT'

  return (
    <>
      <DomainOrganizationSection
        mode="institutions"
        anchorId="organizations"
        event={event}
        relations={institutionRelations}
        expectExpanded={expectInstitutions}
        onPatch={onPatch}
      />
      <DomainOrganizationSection
        mode="companies"
        anchorId="companies"
        event={event}
        relations={companyRelations}
        expectExpanded={expectCompanies}
        onPatch={onPatch}
      />
    </>
  )
}

function DomainOrganizationSection({
  mode,
  anchorId,
  event,
  relations,
  expectExpanded,
  onPatch,
}: {
  mode: 'institutions' | 'companies'
  anchorId: string
  event: EventDetail
  relations: EventOrganization[]
  expectExpanded: boolean
  onPatch?: (dto: UpdateEventDto) => void
}) {
  const isCompanyMode = mode === 'companies'
  const queryClient = useQueryClient()
  const coloredSides = useMemo(
    () => withSideColors(event.sides ?? []),
    [event.sides],
  )
  const sideById = useMemo(
    () =>
      new Map(
        coloredSides.map(
          (side) => [side.id, { name: side.name, color: side.color }] as const,
        ),
      ),
    [coloredSides],
  )
  const sideOptions = useMemo(
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

  const [linkModalOpen, setLinkModalOpen] = useState(false)
  const [initialDraft, setInitialDraft] = useState<ActorRelationDraft | null>(null)
  const [creatingOpen, setCreatingOpen] = useState(false)
  const [dragRelationId, setDragRelationId] = useState<string | null>(null)
  const [dragOverSideKey, setDragOverSideKey] = useState<string | null>(null)

  const collapsed = relations.length === 0 && !expectExpanded

  const defaultCountryId = (event.relatedCountries ?? [])[0]?.id ?? undefined
  const defaultHistoricalCountryId =
    (event.relatedHistoricalCountries ?? [])[0]?.id ?? undefined

  const {
    data: rawOrganizations = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['organizations', 'event-link-candidates', mode],
    queryFn: () =>
      getOrganizations(
        getApiConnection(),
        isCompanyMode ? { type: 'COMPANY' } : { excludeCompanies: true },
      ),
    enabled: linkModalOpen,
    staleTime: 60_000,
  })

  const candidatePool = useMemo(
    () =>
      rawOrganizations.filter((org) =>
        isCompanyMode ? org.type === 'COMPANY' : org.type !== 'COMPANY',
      ),
    [rawOrganizations, isCompanyMode],
  )

  const existingByOrgId = useMemo(
    () => new Map(relations.map((rel) => [rel.organizationId, rel])),
    [relations],
  )

  const participantCountrySideMap = useMemo(() => {
    const map = new Map<string, { name: string; sideId: string | null }>()
    for (const country of event.relatedCountries ?? []) {
      map.set(`C:${country.id}`, {
        name: country.name,
        sideId: country.sideId ?? null,
      })
    }
    for (const country of event.relatedHistoricalCountries ?? []) {
      map.set(`H:${country.id}`, {
        name: country.name,
        sideId: country.sideId ?? null,
      })
    }
    return map
  }, [event.relatedCountries, event.relatedHistoricalCountries])

  const modalCandidates = useMemo<RelationCandidateItem[]>(
    () =>
      candidatePool
        .slice()
        .sort((left, right) => left.name.localeCompare(right.name, 'ko'))
        .map((organization) => {
          const existing = existingByOrgId.get(organization.id)
          const countryName =
            organization.historicalCountry?.name ?? organization.country?.name ?? null
          const resolvedCompanyId =
            (organization as { companyId?: string | null }).companyId ??
            existing?.companyId ??
            null
          return {
            key: organization.id,
            name: organization.name,
            shortName: organization.shortName ?? null,
            logoUrl: organization.logoUrl ?? null,
            metaText:
              [
                !isCompanyMode && organization.type
                  ? ORGANIZATION_TYPE_LABEL[organization.type]
                  : null,
                countryName,
              ]
                .filter(Boolean)
                .join(' · ') || null,
            detailHref: isCompanyMode
              ? resolvedCompanyId
                ? pathKeys.companies.detail(resolvedCompanyId)
                : null
              : `/organizations?selected=${encodeURIComponent(organization.id)}`,
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
    [candidatePool, existingByOrgId, isCompanyMode],
  )

  const refresh = () =>
    void queryClient.invalidateQueries({ queryKey: eventKeys.detail(event.id) })

  const saveModalMutation = useMutation({
    mutationFn: async (draft: ActorRelationDraft) => {
      const nextRole = draft.role as EventOrganizationRole
      const explicitSideId = draft.sideId === 'none' ? null : draft.sideId
      const nextDesc = draft.roleDescription.trim() || null

      if (draft.relationId) {
        const updated = await updateEventOrganization(event.id, draft.relationId, {
          role: nextRole,
          sideId: explicitSideId,
          roleDescription: nextDesc,
        })
        return updated.relationId
      }

      const matchedOrg = candidatePool.find(
        (candidate) => candidate.id === draft.candidateKey,
      )
      const inferredSideId =
        explicitSideId ??
        (matchedOrg?.countryId
          ? participantCountrySideMap.get(`C:${matchedOrg.countryId}`)?.sideId
          : null) ??
        (matchedOrg?.historicalCountryId
          ? participantCountrySideMap.get(`H:${matchedOrg.historicalCountryId}`)?.sideId
          : null) ??
        null

      const created = await addEventOrganization(event.id, {
        organizationId: draft.candidateKey,
        role: nextRole,
        sideId: inferredSideId,
        roleDescription: nextDesc,
      })
      return created.relationId
    },
    onSuccess: (_savedId, draft) => {
      notify.success(
        draft.relationId
          ? `‘${draft.name}’ 참여 내용을 수정했습니다`
          : `${draft.name}을(를) ${ROLE_LABEL[draft.role as EventOrganizationRole]}(으)로 연결했습니다`,
      )
      refresh()
    },
    onError: (error) =>
      notify.error(
        error instanceof Error ? error.message : '연결하지 못했습니다',
      ),
  })

  const removeMutation = useMutation({
    mutationFn: (relationId: string) =>
      removeEventOrganization(event.id, relationId),
    onSuccess: () => {
      notify.success(
        isCompanyMode
          ? '기업 연결을 해제했습니다 (기업 정보 자체는 남아 있습니다)'
          : '기구·조직 연결을 해제했습니다 (조직 정보 자체는 남아 있습니다)',
      )
      refresh()
    },
    onError: () => notify.error('연결 해제에 실패했습니다'),
  })

  const handleUpdateSide = async (
    relationId: string,
    sideId: string | null,
  ) => {
    try {
      await updateEventOrganization(event.id, relationId, { sideId })
      refresh()
    } catch (error) {
      notify.error(
        error instanceof Error ? error.message : '진영 변경에 실패했습니다',
      )
    }
  }

  const handleUpdateRole = async (
    relationId: string,
    role: EventOrganizationRole,
  ) => {
    try {
      await updateEventOrganization(event.id, relationId, { role })
      refresh()
    } catch (error) {
      notify.error(
        error instanceof Error ? error.message : '역할 변경에 실패했습니다',
      )
    }
  }

  const handleImportMembers = async (relation: EventOrganization) => {
    if (!onPatch) return
    try {
      const members = await getOrganizationMembers(
        getApiConnection(),
        relation.organizationId,
      )
      if (members.length === 0) {
        notify.info(`‘${relation.name}’에 등록된 소속 인물이 없습니다.`)
        return
      }
      const currentPersons = event.relatedPersons ?? []
      const existingById = new Map(
        currentPersons.map((person) => [person.personId, person]),
      )
      const nextPersons = [
        ...currentPersons.map((person) => ({
          personId: person.personId,
          role: person.role ?? undefined,
          note: person.note ?? undefined,
          sideId: person.sideId ?? undefined,
        })),
      ]
      let addedCount = 0
      for (const member of members) {
        const pid = member.person.id
        const existing = existingById.get(pid)
        if (existing) {
          if (relation.sideId && existing.sideId !== relation.sideId) {
            const idx = nextPersons.findIndex((np) => np.personId === pid)
            if (idx >= 0) {
              nextPersons[idx] = {
                ...nextPersons[idx],
                sideId: relation.sideId,
              }
              addedCount += 1
            }
          }
        } else {
          nextPersons.push({
            personId: pid,
            role: member.roleTitle ?? relation.name,
            note: undefined,
            sideId: relation.sideId ?? undefined,
          })
          addedCount += 1
        }
      }
      if (addedCount > 0) {
        onPatch({ relatedPersons: nextPersons } as UpdateEventDto)
        notify.success(
          `‘${relation.name}’ 소속 인물 ${addedCount}명을 참여 인물로 반영했습니다`,
        )
      } else {
        notify.info('이미 모든 소속 인물이 이 사건에 참여하고 있습니다')
      }
    } catch (error) {
      notify.error(
        error instanceof Error
          ? error.message
          : '소속 인물을 불러오지 못했습니다',
      )
    }
  }

  const handleImportMemberCountries = async (relation: EventOrganization) => {
    if (!onPatch) return
    try {
      const memberships = await getOrganizationCountryMemberships(
        getApiConnection(),
        relation.organizationId,
      )
      const targetYear = signedYearFromIsoLike(event.startDate)
      const activeMemberships = memberships
        .map((membership) => ({
          membership,
          resolvedRole: resolveOrganizationMembershipRoleAtYear(membership, targetYear),
        }))
        .filter(
          (
            entry,
          ): entry is {
            membership: (typeof memberships)[number]
            resolvedRole: NonNullable<typeof entry.resolvedRole>
          } =>
            entry.resolvedRole !== null &&
            isOrganizationMembershipActiveAtYear(entry.membership, targetYear),
        )
      if (activeMemberships.length === 0) {
        notify.info(
          `‘${relation.name}’에 이 시점 기준 등록된 회원국·파트너국이 없습니다.`,
        )
        return
      }
      const existingParticipants = toParticipants(
        event.relatedCountries,
        event.relatedHistoricalCountries,
      )
      const existingKeys = new Set(
        existingParticipants.map((participant) => participantKey(participant)),
      )
      const nextParticipants: EventCountryParticipant[] = [
        ...existingParticipants,
      ]
      let addedCount = 0
      for (const { membership, resolvedRole } of activeMemberships) {
        const mappedRole =
          resolvedRole === 'OBSERVER' || resolvedRole === 'DIALOGUE_PARTNER'
            ? 'OBSERVER'
            : 'PARTICIPANT'
        const candidate: EventCountryParticipant = membership.historicalCountryId
          ? {
              historicalCountryId: membership.historicalCountryId,
              role: mappedRole,
              ...(relation.sideId ? { sideId: relation.sideId } : {}),
            }
          : {
              countryId: membership.countryId,
              role: mappedRole,
              ...(relation.sideId ? { sideId: relation.sideId } : {}),
            }
        const key = participantKey(candidate)
        if (!existingKeys.has(key)) {
          existingKeys.add(key)
          nextParticipants.push(candidate)
          addedCount += 1
        }
      }
      if (addedCount > 0) {
        onPatch({ relatedCountries: nextParticipants } as UpdateEventDto)
        notify.success(
          `‘${relation.name}’ 회원국·파트너국 ${addedCount}개국을 사건 참여국으로 반영했습니다`,
        )
      } else {
        notify.info('이미 모든 회원국이 이 사건에 참여하고 있습니다')
      }
    } catch (error) {
      notify.error(
        error instanceof Error
          ? error.message
          : '회원국 목록을 불러오지 못했습니다',
      )
    }
  }

  const handleRemove = async (relation: EventOrganization) => {
    const ok = await confirm({
      title: '연결 해제',
      message: `「${relation.name}」(${ROLE_LABEL[relation.role]})과 이 사건의 연결만 끊습니다. ${
        isCompanyMode ? '기업' : '기구·조직'
      } 정보는 그대로 남습니다.`,
      confirmLabel: '연결 해제',
      danger: true,
    })
    if (ok) removeMutation.mutate(relation.relationId)
  }

  const closeLinkModal = () => {
    setLinkModalOpen(false)
    setInitialDraft(null)
  }

  const sectionTitle = isCompanyMode ? '관련 기업' : '관련 기구·협의체·조직'
  const nounShort = isCompanyMode ? '기업' : '기구·조직'

  const modalsNode = (
    <>
      <ActorRelationLinkModal
        isOpen={linkModalOpen && !creatingOpen}
        onClose={closeLinkModal}
        title={isCompanyMode ? '관련 기업 잇기' : '관련 기구·협의체·조직 잇기'}
        nounLabel={nounShort}
        eventTitle={event.title}
        searchPlaceholder={
          isCompanyMode
            ? '기업명 · 약칭으로 찾기 (예: 삼성전자, 동인도회사)'
            : '기구·협의체·조직명으로 찾기 (예: 유엔, NATO, 아세안)'
        }
        candidates={modalCandidates}
        roleOptions={ORG_ROLE_ITEMS}
        defaultRole="PRINCIPAL"
        sideOptions={sideOptions}
        loading={isLoading}
        failed={isError}
        saving={saveModalMutation.isPending}
        onRetry={() => void refetch()}
        initialDraft={initialDraft}
        createLabel={isCompanyMode ? '새 기업' : '새 기구·조직'}
        onCreateNew={() => setCreatingOpen(true)}
        onSave={async (draft) => saveModalMutation.mutateAsync(draft)}
        onDelete={async (relationId) => {
          await removeMutation.mutateAsync(relationId)
        }}
      />

      {!isCompanyMode && creatingOpen && (
        <OrganizationQuickCreateModal
          defaultCountryId={defaultCountryId}
          defaultHistoricalCountryId={defaultHistoricalCountryId}
          defaultType={
            event.type === 'SUMMIT' || event.domain === 'DIPLOMACY'
              ? 'MULTILATERAL_FORUM'
              : 'NGO'
          }
          candidateCountries={[
            ...(event.relatedCountries ?? []).map((countryItem) => ({
              countryId: countryItem.id,
              name: countryItem.name,
              flagEmoji: countryItem.flagEmoji,
            })),
            ...(event.relatedHistoricalCountries ?? []).map((histCountryItem) => ({
              historicalCountryId: histCountryItem.id,
              name: histCountryItem.name,
            })),
          ]}
          candidatePersons={(event.relatedPersons ?? []).map((related) => ({
            id: related.personId,
            name: [related.person?.name, related.person?.surname]
              .filter(Boolean)
              .join(' '),
            role: related.role ?? undefined,
          }))}
          onClose={() => setCreatingOpen(false)}
          onCreated={(created) => {
            setCreatingOpen(false)
            void queryClient.invalidateQueries({ queryKey: ['organizations'] })
            setInitialDraft({
              candidateKey: created.id,
              name: created.name,
              detailHref: `/organizations?selected=${encodeURIComponent(created.id)}`,
              role: 'PRINCIPAL',
              sideId: 'none',
              roleDescription: '',
            })
            setLinkModalOpen(true)
          }}
        />
      )}

      {isCompanyMode && creatingOpen && (
        <Suspense fallback={null}>
          <LazyCompanyRegisterModal
            isOpen={creatingOpen}
            onClose={() => setCreatingOpen(false)}
            defaultCountryId={defaultCountryId}
            defaultHistoricalCountryId={defaultHistoricalCountryId}
            onSaved={(created) => {
              setCreatingOpen(false)
              void queryClient.invalidateQueries({
                queryKey: ['organizations'],
              })
              if (created.organizationId) {
                setInitialDraft({
                  candidateKey: created.organizationId,
                  name: created.name,
                  role: 'PRINCIPAL',
                  sideId: 'none',
                  roleDescription: '',
                })
                setLinkModalOpen(true)
              }
            }}
          />
        </Suspense>
      )}
    </>
  )

  if (collapsed) {
    return (
      <CollapsedActorSlot id={anchorId}>
        <CollapsedActorChipBtn
          type="button"
          title={
            isCompanyMode
              ? '상장·창립·인수·특허·교역 등 이 사건의 당사 기업을 잇습니다'
              : 'UN·NATO 등 다자기구(회원국 일괄 반영) 또는 민간·노동·학술단체를 잇습니다'
          }
          onClick={() => {
            setInitialDraft(null)
            setLinkModalOpen(true)
          }}
        >
          <FiPlus size={13} aria-hidden />
          <span>{isCompanyMode ? '관련 기업' : '국제기구 · 협의체 · 조직'}</span>
        </CollapsedActorChipBtn>
        {modalsNode}
      </CollapsedActorSlot>
    )
  }

  return (
    <S.Section id={anchorId}>
      <S.SectionHeader>
        <S.SectionTitle>{sectionTitle}</S.SectionTitle>
        {relations.length > 1 && (
          <S.SectionSubtitle>{relations.length}곳</S.SectionSubtitle>
        )}
      </S.SectionHeader>

      {relations.length > 0 && coloredSides.length > 0 && (
        <SideDropZoneBar aria-label={`${nounShort} 진영 드래그 배정 바`}>
          <SideDropHint>드래그하여 진영 배정:</SideDropHint>
          {coloredSides.map((side) => {
            const count = relations.filter(
              (relation) => relation.sideId === side.id,
            ).length
            return (
              <SideDropPill
                key={side.id}
                $color={side.color}
                $dragOver={dragOverSideKey === side.id}
                onDragOver={(dragEvent) => {
                  if (!dragRelationId) return
                  dragEvent.preventDefault()
                  dragEvent.dataTransfer.dropEffect = 'move'
                  if (dragOverSideKey !== side.id) setDragOverSideKey(side.id)
                }}
                onDragLeave={() => {
                  if (dragOverSideKey === side.id) setDragOverSideKey(null)
                }}
                onDrop={(dragEvent) => {
                  dragEvent.preventDefault()
                  setDragOverSideKey(null)
                  if (dragRelationId) {
                    void handleUpdateSide(dragRelationId, side.id)
                    setDragRelationId(null)
                  }
                }}
              >
                <SideDot $color={side.color} aria-hidden />
                <span>{side.name}</span>
                <SideDropCount>{count}</SideDropCount>
              </SideDropPill>
            )
          })}
          <SideDropPill
            $dragOver={dragOverSideKey === 'none'}
            onDragOver={(dragEvent) => {
              if (!dragRelationId) return
              dragEvent.preventDefault()
              dragEvent.dataTransfer.dropEffect = 'move'
              if (dragOverSideKey !== 'none') setDragOverSideKey('none')
            }}
            onDragLeave={() => {
              if (dragOverSideKey === 'none') setDragOverSideKey(null)
            }}
            onDrop={(dragEvent) => {
              dragEvent.preventDefault()
              setDragOverSideKey(null)
              if (dragRelationId) {
                void handleUpdateSide(dragRelationId, null)
                setDragRelationId(null)
              }
            }}
          >
            <span>진영 미지정</span>
            <SideDropCount>
              {relations.filter((relation) => !relation.sideId).length}
            </SideDropCount>
          </SideDropPill>
        </SideDropZoneBar>
      )}

      {relations.length > 0 ? (
        <Rows>
          {relations.map((relation) => (
            <OrganizationRow
              key={relation.relationId}
              relation={relation}
              side={
                relation.sideId ? (sideById.get(relation.sideId) ?? null) : null
              }
              sideOptions={sideOptions}
              draggable={coloredSides.length > 0}
              onDragStart={(dragEvent) => {
                setDragRelationId(relation.relationId)
                dragEvent.dataTransfer.effectAllowed = 'move'
              }}
              onDragEnd={() => {
                setDragRelationId(null)
                setDragOverSideKey(null)
              }}
              onUpdateSide={(sideId) =>
                void handleUpdateSide(relation.relationId, sideId)
              }
              onUpdateRole={(role) =>
                void handleUpdateRole(relation.relationId, role)
              }
              onImportCountries={
                !isCompanyMode && onPatch
                  ? () => void handleImportMemberCountries(relation)
                  : undefined
              }
              onImportMembers={
                onPatch ? () => void handleImportMembers(relation) : undefined
              }
              onRemove={() => void handleRemove(relation)}
            />
          ))}
        </Rows>
      ) : (
        <S.HelperText>
          {isCompanyMode
            ? '상장·창립·인수·특허독점처럼 기업이 당사자인 사건이면 연결하세요.'
            : '국제기구·다자협의체(UN·아세안·NATO 등) 또는 민간·노동·학술단체를 연결하세요.'}
        </S.HelperText>
      )}

      <ActionRow>
        <ActionBtn
          type="button"
          onClick={() => {
            setInitialDraft(null)
            setLinkModalOpen(true)
          }}
        >
          <FiPlus size={14} />
          {isCompanyMode ? '기존 기업과 잇기' : '기존 기구·조직과 잇기'}
        </ActionBtn>
        <ActionBtn type="button" onClick={() => setCreatingOpen(true)}>
          <FiPlus size={14} />
          {isCompanyMode ? '새 기업 등록' : '새 기구·조직 등록'}
        </ActionBtn>
      </ActionRow>

      {modalsNode}
    </S.Section>
  )
}

function OrganizationRow({
  relation,
  side,
  sideOptions,
  draggable,
  onDragStart,
  onDragEnd,
  onUpdateSide,
  onUpdateRole,
  onImportCountries,
  onImportMembers,
  onRemove,
}: {
  relation: EventOrganization
  side: { name: string; color: string } | null
  sideOptions: Array<{ value: string; label: string }>
  draggable?: boolean
  onDragStart?: (dragEvent: React.DragEvent<HTMLLIElement>) => void
  onDragEnd?: (dragEvent: React.DragEvent<HTMLLIElement>) => void
  onUpdateSide: (sideId: string | null) => void
  onUpdateRole: (role: EventOrganizationRole) => void
  onImportCountries?: () => void
  onImportMembers?: () => void
  onRemove: () => void
}) {
  const stock = relation.latestStock
  const marketCap = stock
    ? formatCompactMoney(stock.marketCap, stock.currency)
    : null
  const price = stock ? formatPrice(stock.price, stock.currency) : null
  const stockLine = [
    marketCap ? `시가총액 ${marketCap}` : null,
    price ? `주가 ${price}` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <Row
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      {relation.logoUrl ? (
        <Logo src={relation.logoUrl} alt="" />
      ) : (
        <LogoFallback aria-hidden>{relation.name.slice(0, 1)}</LogoFallback>
      )}
      <Body>
        <NameLine>
          {relation.companyId ? (
            <NameLink to={pathKeys.companies.detail(relation.companyId)}>
              {relation.name}
              <FiExternalLink size={12} aria-hidden />
            </NameLink>
          ) : (
            <NameLink
              to={`/organizations?selected=${encodeURIComponent(relation.organizationId)}`}
              title="기구·조직 상세 보기"
            >
              {relation.name}
              <FiExternalLink size={12} aria-hidden />
            </NameLink>
          )}
          <RoleBadge>
            <InlineSelect
              value={relation.role}
              options={ROLE_OPTIONS}
              onSave={(nextRole) =>
                onUpdateRole(nextRole as EventOrganizationRole)
              }
              placeholder={ROLE_LABEL[relation.role] ?? relation.role}
              label={`${relation.name}의 사건 내 역할`}
            />
          </RoleBadge>
          {sideOptions.length > 0 && (
            <SideBadge $color={side?.color}>
              {side && <SideDot $color={side.color} aria-hidden />}
              <InlineSelect
                value={relation.sideId ?? 'none'}
                options={sideOptions}
                onSave={(next) =>
                  onUpdateSide(next === 'none' ? null : next)
                }
                placeholder="진영 지정"
                label={`${relation.name}의 소속 진영`}
              />
            </SideBadge>
          )}
          {onImportCountries && !relation.companyId && (
            <ImportMembersBtn
              type="button"
              title={`${relation.name} 회원국·파트너국을 사건 참여국으로 일괄 불러오기`}
              onClick={onImportCountries}
            >
              회원국 불러오기
            </ImportMembersBtn>
          )}
          {onImportMembers && (
            <ImportMembersBtn
              type="button"
              title={`${relation.name} 소속 인물(위원·역할)을 사건 참여 인물로 불러오기`}
              onClick={onImportMembers}
            >
              소속 인물 불러오기
            </ImportMembersBtn>
          )}
        </NameLine>
        {relation.roleDescription && <Meta>{relation.roleDescription}</Meta>}
        {stockLine && (
          <Meta>
            {stockLine}
            {stock?.date && <> — {stock.date.slice(0, 10)} 기준</>}
          </Meta>
        )}
      </Body>
      <RemoveButton
        type="button"
        onClick={onRemove}
        aria-label={`${relation.name} 연결 해제`}
      >
        <FiX />
      </RemoveButton>
    </Row>
  )
}

/* ───────────────────────── styles ───────────────────────── */

const Rows = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  border-top: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
`

const Row = styled.li`
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr) auto;
  align-items: start;
  gap: 10px;
  padding: 10px 4px;
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};

  &:hover {
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
  }

  &[draggable='true'] {
    cursor: grab;
  }

  &[draggable='true']:active {
    cursor: grabbing;
  }
`

const Logo = styled.img`
  width: 30px;
  height: 30px;
  border-radius: ${RADIUS.XS};
  object-fit: contain;
  outline: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  outline-offset: -1px;
`

const LogoFallback = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: ${RADIUS.XS};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  font-size: 12.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const Body = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
`

const NameLine = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
`

const NameLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 14.5px;
  font-weight: 650;
  color: ${({ theme }) => theme.colors.text.primary};
  text-decoration: none;

  &:hover,
  &:focus-visible {
    text-decoration: underline;
    text-underline-offset: 3px;
  }
`

const RoleBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 1px 7px;
  border-radius: ${RADIUS.PILL};
  border: 1px solid ${({ theme }) => theme.colors.border};
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const Meta = styled.div`
  font-size: 12.5px;
  font-variant-numeric: tabular-nums;
  color: ${metaText};
`

const RemoveButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  padding: 0;
  border: none;
  border-radius: ${RADIUS.XS};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.error};
  }
`

const SideBadge = styled.span<{ $color?: string }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 1px 7px;
  border-radius: ${RADIUS.PILL};
  border: 1px solid
    ${({ theme, $color }) => ($color ? `${$color}55` : theme.colors.border)};
  background: ${({ $color }) => ($color ? `${$color}14` : 'transparent')};
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme, $color }) => $color ?? theme.colors.text.secondary};
`

const SideDot = styled.span<{ $color: string }>`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  flex-shrink: 0;
`

const ImportMembersBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 24px;
  padding: 0 8px;
  border-radius: ${RADIUS.XS};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-family: inherit;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    border-color: ${({ theme }) => theme.colors.text.secondary};
  }
`

const SideDropZoneBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  padding: 6px 0 8px;
`

const SideDropHint = styled.span`
  font-size: 11.5px;
  font-weight: 600;
  color: ${metaText};
  margin-right: 2px;
`

const SideDropPill = styled.span<{ $color?: string; $dragOver?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 25px;
  padding: 0 9px;
  border-radius: ${RADIUS.PILL};
  border: 1px solid
    ${({ theme, $color, $dragOver }) =>
      $dragOver
        ? ($color ?? theme.colors.accent)
        : $color
          ? `${$color}55`
          : theme.colors.border};
  background: ${({ theme, $color, $dragOver }) =>
    $dragOver
      ? $color
        ? `${$color}28`
        : `${theme.colors.accent}18`
      : $color
        ? `${$color}12`
        : theme.colors.background.primary};
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme, $color }) => $color ?? theme.colors.text.secondary};
  transition: border-color 0.14s, background 0.14s;
`

const SideDropCount = styled.span`
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  opacity: 0.75;
`

const ActionRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
`

const ActionBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  ${toolbarControlHeight}
  padding: 0 12px;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  border-radius: ${RADIUS.SM};
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    background: ${({ theme }) => ledgerHoverFill(theme.mode)};
    border-color: ${({ theme }) => ledgerAccentBorder(theme.mode)};
  }
`
