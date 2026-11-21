/**
 * 사건 ↔ 기구·협의체·조직(`!relation.companyId`) 및 기업(`Boolean(relation.companyId)`) 분리 섹션.
 *
 * 연관 탭 `RelatedLinkModal`과 동일한 2단 잇기 모달(`ActorRelationLinkModal`)로
 * 기구/기업 선택 + 역할·진영·설명을 한 창에서 지정한다.
 */
import React, { lazy, Suspense, useMemo, useState } from 'react'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FiEdit2, FiExternalLink, FiGlobe, FiPlus, FiUsers } from 'react-icons/fi'
import { Link } from 'react-router-dom'
import styled from 'styled-components'

import {
  type EventCountryParticipant,
  participantKey,
  toParticipants,
} from '@/entities/event/model/country-participant'
import {
  ledgerHairline,
  ledgerHairlineStrong,
  ledgerHoverFill,
  RADIUS,
} from '@/entities/event/ui/ledger-tokens'
import { ORGANIZATION_ROLE_OPTIONS as ROLE_OPTIONS } from '@/features/event-facets/model/organization-roles'
import { metaText } from '@/pages/events/styles/theme'
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
import { PopoverMenu, type PopoverMenuEntry } from '@/shared/ui/popover-menu'
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
  CollapsedActorInfo,
  CollapsedActorSlot,
  FactTag,
  GhostRowBtn,
  HeaderControlBtn,
  RowControls,
  SectionHintText,
} from './actors/actors.styles'
import { withSideColors } from './side-colors'

interface DetailOrganizationsProps {
  event: EventDetail
  expectOrganizations: boolean
  readOnly?: boolean
  displayFilter?: 'expanded-only' | 'collapsed-only'
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
  readOnly = false,
  displayFilter,
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
        readOnly={readOnly}
        displayFilter={displayFilter}
        onPatch={onPatch}
      />
      <DomainOrganizationSection
        mode="companies"
        anchorId="companies"
        event={event}
        relations={companyRelations}
        expectExpanded={expectCompanies}
        readOnly={readOnly}
        displayFilter={displayFilter}
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
  readOnly = false,
  displayFilter,
  onPatch,
}: {
  mode: 'institutions' | 'companies'
  anchorId: string
  event: EventDetail
  relations: EventOrganization[]
  expectExpanded: boolean
  readOnly?: boolean
  displayFilter?: 'expanded-only' | 'collapsed-only'
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

  const openEditRelation = (relation: EventOrganization) => {
    setInitialDraft({
      relationId: relation.relationId,
      candidateKey: relation.organizationId,
      name: relation.name,
      detailHref: relation.companyId
        ? pathKeys.companies.detail(relation.companyId)
        : `/organizations?selected=${encodeURIComponent(relation.organizationId)}`,
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

  if (readOnly && relations.length === 0) return null

  if (collapsed) {
    if (displayFilter === 'expanded-only') return null
    return (
      <CollapsedActorSlot id={anchorId}>
        <CollapsedActorInfo>
          <strong>{isCompanyMode ? '관련 기업' : '국제기구 · 협의체 · 민간조직'}</strong>
          <span>
            {isCompanyMode
              ? '창립·상장·인수합병·특허·교역 등의 당사 기업'
              : '유엔·NATO 등 국제기구(회원국 일괄 반영) 또는 노동·시민·학술단체'}
          </span>
        </CollapsedActorInfo>
        <CollapsedActorChipBtn
          type="button"
          onClick={() => {
            setInitialDraft(null)
            setLinkModalOpen(true)
          }}
        >
          <FiPlus size={13} aria-hidden />
          <span>{isCompanyMode ? '기업 잇기' : '기구·조직 잇기'}</span>
        </CollapsedActorChipBtn>
        {modalsNode}
      </CollapsedActorSlot>
    )
  }

  if (displayFilter === 'collapsed-only') return null

  return (
    <S.Section id={anchorId}>
      <S.SectionHeader>
        <S.SectionTitle>{sectionTitle}</S.SectionTitle>
        {relations.length > 0 && (
          <S.SectionSubtitle>{relations.length}곳</S.SectionSubtitle>
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
              {isCompanyMode ? '기업 잇기' : '기구·조직 잇기'}
            </HeaderControlBtn>
          </S.SectionActions>
        )}
      </S.SectionHeader>
      <SectionLeadWrap>
        <SectionHintText>
          {isCompanyMode
            ? '이 사건의 당사·수혜·피해 기업과 주요 역할을 기록합니다.'
            : '국제기구·다자협의체 및 민간·노동·학술단체의 역할을 기록합니다. 더보기(⋯)에서 회원국·소속 인물을 일괄 반영할 수 있습니다.'}
        </SectionHintText>
      </SectionLeadWrap>

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
              readOnly={readOnly}
              onOpenEdit={() => openEditRelation(relation)}
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
            ? '아직 연결된 기업이 없습니다 — 우측 ‘기업 잇기’로 기존 기업을 찾거나 새로 등록해 연결하세요.'
            : '아직 연결된 기구·조직이 없습니다 — 우측 ‘기구·조직 잇기’로 연결하세요.'}
        </S.HelperText>
      )}

      {modalsNode}
    </S.Section>
  )
}

function OrganizationRow({
  relation,
  side,
  sideOptions,
  readOnly = false,
  onOpenEdit,
  onUpdateSide,
  onUpdateRole,
  onImportCountries,
  onImportMembers,
  onRemove,
}: {
  relation: EventOrganization
  side: { name: string; color: string } | null
  sideOptions: Array<{ value: string; label: string }>
  readOnly?: boolean
  onOpenEdit: () => void
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

  const menuItems: PopoverMenuEntry[] = [
    {
      id: 'edit',
      label: '편집 (역할 · 진영 · 설명)',
      icon: <FiEdit2 size={13} />,
      onSelect: () => onOpenEdit(),
    },
    ...(onImportCountries && !relation.companyId
      ? ([
          {
            id: 'import-countries',
            label: '회원국·파트너국을 참여국으로 불러오기',
            icon: <FiGlobe size={13} />,
            onSelect: () => onImportCountries(),
          },
        ] as PopoverMenuEntry[])
      : []),
    ...(onImportMembers
      ? ([
          {
            id: 'import-members',
            label: '소속 인물을 참여 인물로 불러오기',
            icon: <FiUsers size={13} />,
            onSelect: () => onImportMembers(),
          },
        ] as PopoverMenuEntry[])
      : []),
    { type: 'divider', id: 'div-role' },
    { type: 'section', id: 'sec-role', label: '역할 변경' },
    ...ROLE_OPTIONS.map((option) => ({
      id: `role-${option.value}`,
      label: option.label,
      checked: option.value === relation.role,
      onSelect: () => {
        if (option.value !== relation.role) {
          onUpdateRole(option.value)
        }
      },
    })),
    ...(sideOptions.length > 1
      ? ([
          { type: 'divider', id: 'div-side' },
          { type: 'section', id: 'sec-side', label: '진영 배정' },
          ...sideOptions.map((option) => ({
            id: `side-${option.value}`,
            label: option.label,
            checked: option.value === (relation.sideId ?? 'none'),
            onSelect: () =>
              onUpdateSide(option.value === 'none' ? null : option.value),
          })),
        ] as PopoverMenuEntry[])
      : []),
    { type: 'divider', id: 'div-rm' },
    {
      id: 'remove',
      label: '연결 해제',
      danger: true,
      onSelect: () => onRemove(),
    },
  ]

  return (
    <Row>
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
          <FactTag>{ROLE_LABEL[relation.role] ?? relation.role}</FactTag>
          {side && <FactTag $color={side.color}>{side.name}</FactTag>}
        </NameLine>
        {relation.roleDescription && <Meta>{relation.roleDescription}</Meta>}
        {stockLine && (
          <Meta>
            {stockLine}
            {stock?.date && <> — {stock.date.slice(0, 10)} 기준</>}
          </Meta>
        )}
      </Body>
      {!readOnly && (
        <RowControls>
          <GhostRowBtn
            type="button"
            onClick={onOpenEdit}
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
    </Row>
  )
}

/* ───────────────────────── styles ───────────────────────── */

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

const Meta = styled.div`
  font-size: 12.5px;
  font-variant-numeric: tabular-nums;
  color: ${metaText};
`
