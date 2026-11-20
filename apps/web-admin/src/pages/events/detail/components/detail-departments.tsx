/**
 * 관련 국가 기관 · 사령부 — "어느 기관·사령부가 이 사건을 발령·수령·주도했나".
 *
 * 민간 행정기관(AdministrationDepartment)과 군 최고사령부·부대(MilitaryUnit)를 함께 연결하며,
 * 연관 탭 `RelatedLinkModal`과 동일한 2단 잇기 모달(`ActorRelationLinkModal`)로 대상과 역할·설명을 한 창에서 정한다.
 */
import { useMemo, useState } from 'react'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FiArrowRight, FiPlus, FiX } from 'react-icons/fi'
import { MdDragIndicator } from 'react-icons/md'
import { Link } from 'react-router-dom'
import styled from 'styled-components'

import * as eventDepartmentsApi from '@api/functional/events/departments'
import {
  ledgerAccent,
  ledgerAccentBorder,
  ledgerHairline,
  ledgerHairlineStrong,
  ledgerHoverFill,
  RADIUS,
} from '@/entities/event/ui/ledger-tokens'
import { metaText, toolbarControlHeight } from '@/pages/events/styles/theme'
import {
  administrationDepartmentApi,
  DEPARTMENT_KIND_LABEL,
  EVENT_DEPARTMENT_ROLE_LABEL,
  EVENT_DEPARTMENT_ROLE_OPTIONS,
  type EventDepartmentRoleValue,
} from '@/shared/api/administration-department'
import { getApiConnection } from '@/shared/api/client'
import { eventKeys } from '@/shared/api/event-query-keys'
import { militaryUnitApi } from '@/shared/api/military-unit'
import { militaryUnitTypeLabelKo } from '@/shared/lib/military-unit-type-label'
import { pathKeys } from '@/shared/router'
import { confirm } from '@/shared/ui/confirm-dialog/confirm'
import { notify } from '@/shared/ui/toast'

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
import { InlineText } from './inline'
import { LoadError } from './load-error'

type EventDepartment = Awaited<ReturnType<typeof eventDepartmentsApi.list>>[number]

interface DetailDepartmentsProps {
  event: EventDetail
  readOnly?: boolean
  expectDepartments?: boolean
}

export const eventDepartmentsQueryKey = (eventId: string) =>
  [...eventKeys.detail(eventId), 'departments'] as const

interface ResolvedTargetMeta {
  targetKey: string
  isMilitary: boolean
  id: string
  name: string
  abbreviation: string | null
  kindLabel: string | null
  affiliation: string | null
  href: string | null
}

function resolveTargetMeta(relation: EventDepartment): ResolvedTargetMeta {
  if (relation.militaryUnit) {
    const unit = relation.militaryUnit
    const countryEntity = unit.historicalCountry ?? unit.country ?? null
    const href = countryEntity
      ? `${pathKeys.countryMilitary(countryEntity.id)}?unitId=${encodeURIComponent(unit.id)}`
      : pathKeys.militaryUnitDetail(unit.id)
    const kindLabel = unit.unitType
      ? militaryUnitTypeLabelKo(unit.unitType)
      : '군사 조직'
    return {
      targetKey: `unit:${unit.id}`,
      isMilitary: true,
      id: unit.id,
      name: unit.name,
      abbreviation: unit.abbreviation ?? null,
      kindLabel,
      affiliation: countryEntity?.name ?? null,
      href,
    }
  }
  if (relation.department) {
    const dept = relation.department
    const countryEntity = dept.historicalCountry ?? dept.country ?? null
    const href = countryEntity
      ? `${pathKeys.countryGovernment(countryEntity.id)}?departmentId=${encodeURIComponent(dept.id)}`
      : null
    const kindLabel =
      DEPARTMENT_KIND_LABEL[dept.kind as keyof typeof DEPARTMENT_KIND_LABEL] ??
      dept.kind
    return {
      targetKey: `dept:${dept.id}`,
      isMilitary: false,
      id: dept.id,
      name: dept.name,
      abbreviation: dept.abbreviation ?? null,
      kindLabel,
      affiliation: countryEntity?.name ?? null,
      href,
    }
  }
  return {
    targetKey: `unknown:${relation.id}`,
    isMilitary: false,
    id: relation.id,
    name: '기관 미상',
    abbreviation: null,
    kindLabel: null,
    affiliation: null,
    href: null,
  }
}

const DEPARTMENT_ROLE_ITEMS = EVENT_DEPARTMENT_ROLE_OPTIONS.map((option) => ({
  value: option.value,
  label: option.label,
  hint: option.description,
}))

const DEPARTMENT_CATEGORIES = [
  { key: 'dept', label: '행정 기관' },
  { key: 'unit', label: '군사 사령부·부대' },
]

export function DetailDepartments({
  event,
  readOnly = false,
  expectDepartments,
}: DetailDepartmentsProps) {
  const queryClient = useQueryClient()
  const queryKey = eventDepartmentsQueryKey(event.id)

  const {
    data: relations = [],
    isError,
    isFetching,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: () => eventDepartmentsApi.list(getApiConnection(), event.id),
    staleTime: 30_000,
  })

  const [linkModalOpen, setLinkModalOpen] = useState(false)
  const [initialDraft, setInitialDraft] = useState<ActorRelationDraft | null>(null)
  const [draggingRelationId, setDraggingRelationId] = useState<string | null>(null)
  const [dragOverLane, setDragOverLane] = useState<'issuer' | 'recipient' | null>(null)

  const shouldExpandEmpty = expectDepartments ?? false

  const {
    data: allDepartments = [],
    isLoading: isLoadingDepartments,
    isError: isDeptError,
    refetch: refetchDepts,
  } = useQuery({
    queryKey: ['administration-departments', 'event-link-candidates'],
    queryFn: () => administrationDepartmentApi.getAll({ take: 200 }),
    enabled: linkModalOpen,
    staleTime: 60_000,
  })

  const {
    data: allMilitaryUnits = [],
    isLoading: isLoadingUnits,
    isError: isUnitsError,
    refetch: refetchUnits,
  } = useQuery({
    queryKey: ['military-units', 'event-link-candidates'],
    queryFn: () => militaryUnitApi.getAll(),
    enabled: linkModalOpen,
    staleTime: 60_000,
  })

  const existingByTargetKey = useMemo(() => {
    const map = new Map<string, EventDepartment>()
    for (const relation of relations) {
      map.set(resolveTargetMeta(relation).targetKey, relation)
    }
    return map
  }, [relations])

  const modalCandidates = useMemo<RelationCandidateItem[]>(() => {
    const deptItems: Array<RelationCandidateItem & { sortName: string }> =
      allDepartments.map((department) => {
        const key = `dept:${department.id}`
        const countryEntity = department.historicalCountry ?? department.country ?? null
        const existing = existingByTargetKey.get(key)
        return {
          sortName: department.name,
          key,
          name: department.name,
          shortName: department.abbreviation ?? null,
          category: 'dept',
          monogram: '행',
          metaText: [
            DEPARTMENT_KIND_LABEL[department.kind],
            countryEntity?.name,
            department.nameLocal,
          ]
            .filter(Boolean)
            .join(' · '),
          detailHref: countryEntity
            ? `${pathKeys.countryGovernment(countryEntity.id)}?departmentId=${encodeURIComponent(department.id)}`
            : null,
          existing: existing
            ? {
                relationId: existing.id,
                role: existing.role,
                roleDescription: existing.roleDescription,
              }
            : undefined,
        }
      })

    const unitItems: Array<RelationCandidateItem & { sortName: string }> =
      allMilitaryUnits.map((unitItem) => {
        const key = `unit:${unitItem.id}`
        const countryEntity = unitItem.historicalCountry ?? unitItem.country ?? null
        const existing = existingByTargetKey.get(key)
        return {
          sortName: unitItem.name,
          key,
          name: unitItem.name,
          shortName: unitItem.abbreviation ?? null,
          category: 'unit',
          monogram: '군',
          metaText: [
            unitItem.unitType
              ? militaryUnitTypeLabelKo(unitItem.unitType)
              : '군사 조직',
            countryEntity?.name,
            unitItem.nameLocal ?? unitItem.nameEn,
          ]
            .filter(Boolean)
            .join(' · '),
          detailHref: countryEntity
            ? `${pathKeys.countryMilitary(countryEntity.id)}?unitId=${encodeURIComponent(unitItem.id)}`
            : pathKeys.militaryUnitDetail(unitItem.id),
          existing: existing
            ? {
                relationId: existing.id,
                role: existing.role,
                roleDescription: existing.roleDescription,
              }
            : undefined,
        }
      })

    return [...deptItems, ...unitItems].sort((left, right) =>
      left.sortName.localeCompare(right.sortName, 'ko'),
    )
  }, [allDepartments, allMilitaryUnits, existingByTargetKey])

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey })
    void queryClient.invalidateQueries({ queryKey: ['military-unit'] })
    void queryClient.invalidateQueries({ queryKey: ['administration-department'] })
  }
  const errorMessage = (error: unknown, fallback: string) =>
    error instanceof Error && error.message ? error.message : fallback

  const saveModalMutation = useMutation({
    mutationFn: async (draft: ActorRelationDraft) => {
      const nextRole = draft.role as EventDepartmentRoleValue
      const roleDesc = draft.roleDescription.trim() || null
      if (draft.relationId) {
        const updated = await eventDepartmentsApi.update(
          getApiConnection(),
          event.id,
          draft.relationId,
          { role: nextRole, roleDescription: roleDesc },
        )
        return updated.id
      }
      const isUnit = draft.candidateKey.startsWith('unit:')
      const targetId = draft.candidateKey.slice(5)
      const created = await eventDepartmentsApi.add(
        getApiConnection(),
        event.id,
        isUnit
          ? { militaryUnitId: targetId, role: nextRole, roleDescription: roleDesc }
          : { departmentId: targetId, role: nextRole, roleDescription: roleDesc },
      )
      return created.id
    },
    onSuccess: (_savedId, draft) => {
      notify.success(
        draft.relationId
          ? `‘${draft.name}’ 역할을 수정했습니다`
          : `${draft.name}을(를) ${EVENT_DEPARTMENT_ROLE_LABEL[draft.role as EventDepartmentRoleValue]}(으)로 연결했습니다`,
      )
      refresh()
    },
    onError: (error) => notify.error(errorMessage(error, '연결하지 못했습니다')),
  })

  const updateMutation = useMutation({
    mutationFn: (input: {
      relationId: string
      role?: EventDepartmentRoleValue
      roleDescription?: string | null
    }) =>
      eventDepartmentsApi.update(getApiConnection(), event.id, input.relationId, {
        ...(input.role !== undefined && { role: input.role }),
        ...(input.roleDescription !== undefined && {
          roleDescription: input.roleDescription,
        }),
      }),
    onSuccess: refresh,
    onError: (error) => notify.error(errorMessage(error, '고치지 못했습니다')),
  })

  const removeMutation = useMutation({
    mutationFn: (relationId: string) =>
      eventDepartmentsApi.remove(getApiConnection(), event.id, relationId),
    onSuccess: () => {
      notify.success('연결을 끊었습니다 (기관·사령부 자체는 남아 있습니다)')
      refresh()
    },
    onError: () => notify.error('연결을 끊지 못했습니다'),
  })

  const handleRemove = async (relation: EventDepartment) => {
    const meta = resolveTargetMeta(relation)
    const ok = await confirm({
      title: '연결 끊기',
      message: `「${meta.name}」(${EVENT_DEPARTMENT_ROLE_LABEL[relation.role]})과 이 사건의 연결만 끊습니다. 기관·사령부 정보는 그대로 남습니다.`,
      confirmLabel: '연결 끊기',
      danger: true,
    })
    if (ok) removeMutation.mutate(relation.id)
  }

  const openEditRelation = (relation: EventDepartment) => {
    const meta = resolveTargetMeta(relation)
    setInitialDraft({
      relationId: relation.id,
      candidateKey: meta.targetKey,
      name: meta.name,
      metaText: [meta.kindLabel, meta.affiliation].filter(Boolean).join(' · ') || null,
      detailHref: meta.href,
      role: relation.role,
      sideId: 'none',
      roleDescription: relation.roleDescription ?? '',
    })
    setLinkModalOpen(true)
  }

  const closeLinkModal = () => {
    setLinkModalOpen(false)
    setInitialDraft(null)
  }

  if (readOnly && relations.length === 0) return null

  const issuerRelations = relations.filter(
    (relation) => relation.role === 'ISSUER' || relation.role === 'PRINCIPAL',
  )
  const recipientRelations = relations.filter(
    (relation) =>
      relation.role === 'RECIPIENT' ||
      relation.role === 'PARTICIPANT' ||
      relation.role === 'OTHER',
  )

  const handleDropToLane = (
    dragEvent: React.DragEvent<HTMLElement>,
    targetLane: 'issuer' | 'recipient',
  ) => {
    dragEvent.preventDefault()
    if (readOnly) return
    const rawData = dragEvent.dataTransfer?.getData('text/plain') ?? ''
    const relationId =
      draggingRelationId ||
      (rawData.startsWith('dept-rel:') ? rawData.slice('dept-rel:'.length) : '')
    setDraggingRelationId(null)
    setDragOverLane(null)
    if (!relationId) return
    const targetRelation = relations.find((item) => item.id === relationId)
    if (!targetRelation) return
    const nextRole: EventDepartmentRoleValue =
      targetLane === 'issuer' ? 'ISSUER' : 'RECIPIENT'
    if (targetRelation.role === nextRole) return
    updateMutation.mutate({ relationId: targetRelation.id, role: nextRole })
  }

  if (isError) {
    return (
      <S.Section id="departments">
        <S.SectionHeader>
          <S.SectionTitle>관련 국가 기관·사령부</S.SectionTitle>
        </S.SectionHeader>
        <LoadError
          message="관련 기관·사령부를 불러오지 못했습니다."
          onRetry={() => void refetch()}
          retrying={isFetching}
        />
      </S.Section>
    )
  }

  const linkModalNode = (
    <ActorRelationLinkModal
      isOpen={linkModalOpen}
      onClose={closeLinkModal}
      title="국가 기관 · 사령부 잇기"
      nounLabel="국가 기관·사령부"
      eventTitle={event.title}
      searchPlaceholder="기관·사령부명 · 원어명 · 약칭으로 찾기"
      candidates={modalCandidates}
      categories={DEPARTMENT_CATEGORIES}
      roleOptions={DEPARTMENT_ROLE_ITEMS}
      defaultRole="ISSUER"
      loading={isLoadingDepartments || isLoadingUnits}
      failed={isDeptError || isUnitsError}
      saving={saveModalMutation.isPending}
      onRetry={() => {
        void refetchDepts()
        void refetchUnits()
      }}
      initialDraft={initialDraft}
      onSave={async (draft) => saveModalMutation.mutateAsync(draft)}
      onDelete={async (relationId) => {
        await removeMutation.mutateAsync(relationId)
      }}
    />
  )

  if (relations.length === 0 && !shouldExpandEmpty) {
    if (readOnly) return null
    return (
      <CollapsedActorSlot id="departments">
        <CollapsedActorChipBtn
          type="button"
          title="내각 부처·참모본부·최고사령부·총독부 등 지령·법령을 발령하거나 집행한 국가 기관을 잇습니다"
          onClick={() => {
            setInitialDraft(null)
            setLinkModalOpen(true)
          }}
        >
          <FiPlus size={13} aria-hidden />
          <span>국가 기관 · 사령부</span>
        </CollapsedActorChipBtn>
        {linkModalNode}
      </CollapsedActorSlot>
    )
  }

  return (
    <S.Section id="departments">
      <S.SectionHeader>
        <S.SectionTitle>관련 국가 기관·사령부</S.SectionTitle>
        {relations.length > 0 && <S.SectionSubtitle>{relations.length}곳</S.SectionSubtitle>}
      </S.SectionHeader>

      {relations.length > 0 && (
        <DepartmentFlowBoard role="region" aria-label="관련 기관 역할 흐름 인포그래픽">
          <DepartmentFlowLane
            data-dept-lane="issuer"
            $dragOver={dragOverLane === 'issuer'}
            onDragOver={(dragEvent) => {
              if (readOnly) return
              dragEvent.preventDefault()
              if (dragOverLane !== 'issuer') setDragOverLane('issuer')
            }}
            onDragLeave={(dragEvent) => {
              if (!dragEvent.currentTarget.contains(dragEvent.relatedTarget as Node | null)) {
                setDragOverLane((current) => (current === 'issuer' ? null : current))
              }
            }}
            onDrop={(dragEvent) => handleDropToLane(dragEvent, 'issuer')}
          >
            <DepartmentFlowLaneHead>
              <span>발령 · 기안 · 주도 →</span>
              <DepartmentFlowCount>{issuerRelations.length}</DepartmentFlowCount>
            </DepartmentFlowLaneHead>
            {issuerRelations.length === 0 ? (
              <DepartmentFlowEmpty>
                {readOnly ? '없음' : '기관·사령부를 끌어 놓아 발령·주도로 지정'}
              </DepartmentFlowEmpty>
            ) : (
              <DepartmentFlowPillWrap>
                {issuerRelations.map((relation) => {
                  const meta = resolveTargetMeta(relation)
                  return (
                    <DepartmentFlowPill
                      key={relation.id}
                      draggable={!readOnly}
                      title={readOnly ? undefined : '드래그하여 수령·집행으로 전환'}
                      onDragStart={(dragEvent) => {
                        setDraggingRelationId(relation.id)
                        dragEvent.dataTransfer?.setData('text/plain', `dept-rel:${relation.id}`)
                      }}
                      onDragEnd={() => {
                        setDraggingRelationId(null)
                        setDragOverLane(null)
                      }}
                    >
                      <span>{meta.abbreviation || meta.name}</span>
                      <DepartmentFlowPillRole>
                        {EVENT_DEPARTMENT_ROLE_LABEL[relation.role] ?? relation.role}
                      </DepartmentFlowPillRole>
                    </DepartmentFlowPill>
                  )
                })}
              </DepartmentFlowPillWrap>
            )}
          </DepartmentFlowLane>

          <DepartmentFlowArrow aria-hidden>
            <FiArrowRight size={14} />
          </DepartmentFlowArrow>

          <DepartmentFlowCenter>
            <DepartmentFlowCenterBadge>이 사건</DepartmentFlowCenterBadge>
            <DepartmentFlowCenterTitle>{event.title}</DepartmentFlowCenterTitle>
          </DepartmentFlowCenter>

          <DepartmentFlowArrow aria-hidden>
            <FiArrowRight size={14} />
          </DepartmentFlowArrow>

          <DepartmentFlowLane
            data-dept-lane="recipient"
            $dragOver={dragOverLane === 'recipient'}
            onDragOver={(dragEvent) => {
              if (readOnly) return
              dragEvent.preventDefault()
              if (dragOverLane !== 'recipient') setDragOverLane('recipient')
            }}
            onDragLeave={(dragEvent) => {
              if (!dragEvent.currentTarget.contains(dragEvent.relatedTarget as Node | null)) {
                setDragOverLane((current) => (current === 'recipient' ? null : current))
              }
            }}
            onDrop={(dragEvent) => handleDropToLane(dragEvent, 'recipient')}
          >
            <DepartmentFlowLaneHead>
              <span>→ 수령 · 집행 · 관여</span>
              <DepartmentFlowCount>{recipientRelations.length}</DepartmentFlowCount>
            </DepartmentFlowLaneHead>
            {recipientRelations.length === 0 ? (
              <DepartmentFlowEmpty>
                {readOnly ? '없음' : '기관·사령부를 끌어 놓아 수령·집행으로 지정'}
              </DepartmentFlowEmpty>
            ) : (
              <DepartmentFlowPillWrap>
                {recipientRelations.map((relation) => {
                  const meta = resolveTargetMeta(relation)
                  return (
                    <DepartmentFlowPill
                      key={relation.id}
                      draggable={!readOnly}
                      title={readOnly ? undefined : '드래그하여 발령·주도로 전환'}
                      onDragStart={(dragEvent) => {
                        setDraggingRelationId(relation.id)
                        dragEvent.dataTransfer?.setData('text/plain', `dept-rel:${relation.id}`)
                      }}
                      onDragEnd={() => {
                        setDraggingRelationId(null)
                        setDragOverLane(null)
                      }}
                    >
                      <span>{meta.abbreviation || meta.name}</span>
                      <DepartmentFlowPillRole>
                        {EVENT_DEPARTMENT_ROLE_LABEL[relation.role] ?? relation.role}
                      </DepartmentFlowPillRole>
                    </DepartmentFlowPill>
                  )
                })}
              </DepartmentFlowPillWrap>
            )}
          </DepartmentFlowLane>
        </DepartmentFlowBoard>
      )}

      {relations.length > 0 ? (
        <Rows>
          {relations.map((relation) => {
            const meta = resolveTargetMeta(relation)
            return (
              <Row
                key={relation.id}
                draggable={!readOnly}
                onDragStart={(dragEvent) => {
                  setDraggingRelationId(relation.id)
                  dragEvent.dataTransfer?.setData('text/plain', `dept-rel:${relation.id}`)
                }}
                onDragEnd={() => {
                  setDraggingRelationId(null)
                  setDragOverLane(null)
                }}
              >
                <Body>
                  <NameLine>
                    {!readOnly && (
                      <DragGrip aria-hidden title="드래그하여 위 역할 보드로 이동">
                        <MdDragIndicator />
                      </DragGrip>
                    )}
                    <DomainTag $military={meta.isMilitary}>
                      {meta.isMilitary ? '군사' : '행정'}
                    </DomainTag>
                    {meta.href ? (
                      <NameLink to={meta.href}>{meta.name}</NameLink>
                    ) : (
                      <Name>{meta.name}</Name>
                    )}
                    {meta.abbreviation && <Abbreviation>{meta.abbreviation}</Abbreviation>}
                    <RoleBadge
                      type="button"
                      disabled={readOnly}
                      onClick={() => openEditRelation(relation)}
                      title={readOnly ? undefined : '역할·설명 바꾸기'}
                    >
                      {EVENT_DEPARTMENT_ROLE_LABEL[relation.role] ?? relation.role}
                    </RoleBadge>
                  </NameLine>
                  <Meta>{[meta.kindLabel, meta.affiliation].filter(Boolean).join(' · ')}</Meta>
                  {readOnly ? (
                    relation.roleDescription && <Meta>{relation.roleDescription}</Meta>
                  ) : (
                    <InlineText
                      value={relation.roleDescription ?? ''}
                      placeholder="무엇을 했나 (예: 국방군 지휘참모부가 기안)"
                      label={`${meta.name} 역할 상세`}
                      onSave={(next) =>
                        updateMutation.mutate({
                          relationId: relation.id,
                          roleDescription: next.trim() || null,
                        })
                      }
                    />
                  )}
                </Body>
                {!readOnly && (
                  <RemoveButton
                    type="button"
                    onClick={() => void handleRemove(relation)}
                    aria-label={`${meta.name} 연결 끊기`}
                  >
                    <FiX />
                  </RemoveButton>
                )}
              </Row>
            )
          })}
        </Rows>
      ) : (
        <S.HelperText>
          지령·명령·법령처럼 국가 기관이나 군 최고사령부가 내리거나 받은 사건이면 내린 곳과 받은 곳을 잇습니다.
        </S.HelperText>
      )}

      {!readOnly && (
        <Actions>
          <ActionButton
            type="button"
            onClick={() => {
              setInitialDraft(null)
              setLinkModalOpen(true)
            }}
          >
            <FiPlus size={14} /> 기존 기관·사령부와 잇기
          </ActionButton>
        </Actions>
      )}

      {linkModalNode}
    </S.Section>
  )
}

/* ───────────────────────── styles ───────────────────────── */

const DepartmentFlowBoard = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(120px, 0.8fr) auto minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  padding: 10px 0 12px;
  margin-bottom: 8px;
  border-top: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};

  @media (max-width: 640px) {
    grid-template-columns: minmax(0, 1fr);
  }
`

const DepartmentFlowLane = styled.div<{ $dragOver?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 4px 6px;
  border-radius: ${RADIUS.XS};
  outline: ${({ $dragOver, theme }) =>
    $dragOver ? `1.5px dashed ${ledgerAccent(theme.mode)}` : 'none'};
  background: ${({ $dragOver, theme }) =>
    $dragOver ? ledgerHoverFill(theme.mode) : 'transparent'};
  min-width: 0;
  transition: background 0.14s ease;
`

const DepartmentFlowLaneHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const DepartmentFlowCount = styled.span`
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const DepartmentFlowEmpty = styled.span`
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const DepartmentFlowPillWrap = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
`

const DepartmentFlowPill = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px;
  border-radius: ${RADIUS.PILL};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#f8fafc'};
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: grab;

  &:active {
    cursor: grabbing;
  }
`

const DepartmentFlowPillRole = styled.span`
  font-size: 10.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const DepartmentFlowArrow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  user-select: none;

  @media (max-width: 640px) {
    display: none;
  }
`

const DepartmentFlowCenter = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 6px 8px;
  border-top: 1.5px solid ${({ theme }) => ledgerAccent(theme.mode)};
  border-bottom: 1.5px solid ${({ theme }) => ledgerAccent(theme.mode)};
  text-align: center;
  min-width: 0;
`

const DepartmentFlowCenterBadge = styled.span`
  font-size: 10.5px;
  font-weight: 700;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
`

const DepartmentFlowCenterTitle = styled.span`
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const DragGrip = styled.span`
  display: inline-flex;
  align-items: center;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: grab;
  user-select: none;
`

const Rows = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
`

const Row = styled.li`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: start;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};

  &:first-child {
    padding-top: 4px;
  }

  &:last-child {
    border-bottom: none;
  }
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

const Name = styled.span`
  font-size: 15px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
`

const NameLink = styled(Link)`
  font-size: 15px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  text-decoration: none;

  &:hover {
    color: ${({ theme }) => theme.colors.primary};
    text-decoration: underline;
  }
`

const DomainTag = styled.span<{ $military: boolean }>`
  padding: 1px 6px;
  border-radius: ${RADIUS.PILL};
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.02em;
  background: ${({ $military, theme }) =>
    $military
      ? theme.mode === 'dark'
        ? 'rgba(239, 68, 68, 0.16)'
        : 'rgba(220, 38, 38, 0.08)'
      : theme.mode === 'dark'
        ? 'rgba(59, 130, 246, 0.16)'
        : 'rgba(37, 99, 235, 0.08)'};
  color: ${({ $military, theme }) =>
    $military
      ? theme.mode === 'dark'
        ? '#fca5a5'
        : '#b91c1c'
      : theme.mode === 'dark'
        ? '#93c5fd'
        : '#1d4ed8'};
`

const Abbreviation = styled.span`
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const RoleBadge = styled.button`
  padding: 1px 7px;
  border-radius: ${RADIUS.PILL};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: transparent;
  font-family: inherit;
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;

  &:disabled {
    cursor: default;
  }

  &:not(:disabled):hover,
  &:focus-visible {
    color: ${({ theme }) => theme.colors.text.primary};
    border-color: ${({ theme }) => theme.colors.text.secondary};
  }
`

const Meta = styled.div`
  font-size: 13px;
  color: ${metaText};
`

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
`

const ActionButton = styled.button`
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

const RemoveButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  border-radius: ${RADIUS.SM};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.error};
  }
`
