/**
 * 관련 국가 기관 — "어느 기관이 이 사건을 발령·수령·주도했나".
 *
 * 총통 지령 제21호 같은 사건은 OKW(기안·하달)와 OKH·OKL·OKM(수령·집행) 없이는 반쪽이다.
 * 기관은 '조직'(국가 밖 단체·기업)과 다른 표(AdministrationDepartment)라 칸을 나눈다 —
 * 경계 규칙: 국가 기관(부처·최고사령부·총독부)은 여기, 정당·기업·국제기구는 '관련 기업·조직'.
 *
 * 연결: 기관 고르기(이름·원어명·약칭 검색) → 역할. 같은 기관을 다른 역할로 거는 것은 된다.
 * 역할 상세('국방군 지휘참모부가 기안')는 줄에서 바로 고친다.
 */
import { useMemo, useState } from 'react'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FiPlus, FiX } from 'react-icons/fi'
import styled from 'styled-components'

import * as eventDepartmentsApi from '@api/functional/events/departments'
import { ledgerHairlineStrong, RADIUS } from '@/entities/event/ui/ledger-tokens'
import { metaText } from '@/pages/events/styles/theme'
import {
  administrationDepartmentApi,
  DEPARTMENT_KIND_LABEL,
  EVENT_DEPARTMENT_ROLE_LABEL,
  EVENT_DEPARTMENT_ROLE_OPTIONS,
  type EventDepartmentRoleValue,
} from '@/shared/api/administration-department'
import { getApiConnection } from '@/shared/api/client'
import { eventKeys } from '@/shared/api/event-query-keys'
import { confirm } from '@/shared/ui/confirm-dialog/confirm'
import { SelectModal } from '@/shared/ui/select-modal/select-modal'
import { notify } from '@/shared/ui/toast'

import * as S from '../styles'
import { type EventDetail } from '../use-event-detail'
import { InlineText } from './inline'

type EventDepartment = Awaited<ReturnType<typeof eventDepartmentsApi.list>>[number]

interface DetailDepartmentsProps {
  event: EventDetail
  /** 읽기 전용(휴지통 등) — 연결·편집 버튼을 숨긴다 */
  readOnly?: boolean
  /** 법령·제도·국가/정치 사건 여부 — 비어 있어도 전체 안내를 펼친다 */
  expectDepartments?: boolean
}

export const eventDepartmentsQueryKey = (eventId: string) =>
  [...eventKeys.detail(eventId), 'departments'] as const

/** 줄에 붙일 소속 — 역사국가 우선(정체성 축) */
function affiliationOf(department: EventDepartment['department']): string | null {
  return department.historicalCountry?.name ?? department.country?.name ?? null
}

export function DetailDepartments({
  event,
  readOnly = false,
  expectDepartments,
}: DetailDepartmentsProps) {
  const queryClient = useQueryClient()
  const queryKey = eventDepartmentsQueryKey(event.id)

  const { data: relations = [] } = useQuery({
    queryKey,
    queryFn: () => eventDepartmentsApi.list(getApiConnection(), event.id),
    staleTime: 30_000,
  })

  const [pickerOpen, setPickerOpen] = useState(false)
  const [pendingDepartmentId, setPendingDepartmentId] = useState<string | null>(null)
  const [roleEditing, setRoleEditing] = useState<EventDepartment | null>(null)
  const [draggingRelationId, setDraggingRelationId] = useState<string | null>(null)
  const [dragOverLane, setDragOverLane] = useState<'issuer' | 'recipient' | null>(null)

  const shouldExpandEmpty =
    expectDepartments ??
    (event.type === 'POLICY' ||
      event.type === 'INSTITUTION' ||
      event.domain === 'STATE')

  const { data: allDepartments = [], isLoading } = useQuery({
    queryKey: ['administration-departments', 'event-link-candidates'],
    queryFn: () => administrationDepartmentApi.getAll({ take: 200 }),
    enabled: pickerOpen,
    staleTime: 60_000,
  })

  const departmentOptions = useMemo(
    () =>
      allDepartments
        .map((department) => ({
          value: department.id,
          label: department.abbreviation
            ? `${department.name} (${department.abbreviation})`
            : department.name,
          description: [
            DEPARTMENT_KIND_LABEL[department.kind],
            department.historicalCountry?.name ?? department.country?.name,
            department.nameLocal,
          ]
            .filter(Boolean)
            .join(' · '),
        }))
        .sort((left, right) => left.label.localeCompare(right.label, 'ko')),
    [allDepartments],
  )

  /* 같은 기관에 이미 걸린 역할은 고를 수 없게 뺀다(서버도 409) */
  const roleOptions = useMemo(() => {
    const targetId = pendingDepartmentId ?? roleEditing?.department.id ?? null
    const taken = new Set(
      relations
        .filter((relation) => relation.department.id === targetId && relation.id !== roleEditing?.id)
        .map((relation) => relation.role),
    )
    return EVENT_DEPARTMENT_ROLE_OPTIONS.filter((option) => !taken.has(option.value)).map((option) => ({
      value: option.value,
      label: option.label,
      description: option.description,
    }))
  }, [relations, pendingDepartmentId, roleEditing])

  const refresh = () => void queryClient.invalidateQueries({ queryKey })
  const errorMessage = (error: unknown, fallback: string) =>
    error instanceof Error && error.message ? error.message : fallback

  const addMutation = useMutation({
    mutationFn: (body: { departmentId: string; role: EventDepartmentRoleValue }) =>
      eventDepartmentsApi.add(getApiConnection(), event.id, body),
    onSuccess: (relation) => {
      notify.success(
        `${relation.department.name}을(를) ${EVENT_DEPARTMENT_ROLE_LABEL[relation.role]}(으)로 연결했습니다`,
      )
      refresh()
    },
    onError: (error) => notify.error(errorMessage(error, '연결하지 못했습니다')),
  })

  const updateMutation = useMutation({
    mutationFn: (input: { relationId: string; role?: EventDepartmentRoleValue; roleDescription?: string | null }) =>
      eventDepartmentsApi.update(getApiConnection(), event.id, input.relationId, {
        ...(input.role !== undefined && { role: input.role }),
        ...(input.roleDescription !== undefined && { roleDescription: input.roleDescription }),
      }),
    onSuccess: refresh,
    onError: (error) => notify.error(errorMessage(error, '고치지 못했습니다')),
  })

  const removeMutation = useMutation({
    mutationFn: (relationId: string) => eventDepartmentsApi.remove(getApiConnection(), event.id, relationId),
    onSuccess: () => {
      notify.success('연결을 끊었습니다 (기관 자체는 남아 있습니다)')
      refresh()
    },
    onError: () => notify.error('연결을 끊지 못했습니다'),
  })

  const handleRemove = async (relation: EventDepartment) => {
    const ok = await confirm({
      title: '연결 끊기',
      message: `「${relation.department.name}」(${EVENT_DEPARTMENT_ROLE_LABEL[relation.role]})과 이 사건의 연결만 끊습니다. 기관 정보는 그대로 남습니다.`,
      confirmLabel: '연결 끊기',
      danger: true,
    })
    if (ok) removeMutation.mutate(relation.id)
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

  if (relations.length === 0 && !shouldExpandEmpty) {
    return (
      <CollapsedStrip id="departments" aria-label="관련 국가 기관 빠른 연결">
        <CollapsedStripText>
          <strong>관련 기관</strong> · 지령·법령을 발령하거나 집행한 국가 기관(부처·사령부·총독부)
        </CollapsedStripText>
        <ActionButton type="button" onClick={() => setPickerOpen(true)}>
          <FiPlus size={14} /> 기관 연결
        </ActionButton>
        <SelectModal
          isOpen={pickerOpen}
          onClose={() => setPickerOpen(false)}
          title="연결할 국가 기관"
          options={departmentOptions}
          isLoading={isLoading}
          searchable
          searchPlaceholder="이름·원어명·약칭(OKW)으로 검색..."
          onSelect={(departmentId) => {
            setPickerOpen(false)
            setPendingDepartmentId(departmentId)
          }}
        />
        <SelectModal
          isOpen={pendingDepartmentId !== null}
          onClose={() => setPendingDepartmentId(null)}
          title="이 사건에서의 역할"
          options={roleOptions}
          onSelect={(role) => {
            const nextRole = role as EventDepartmentRoleValue
            const departmentId = pendingDepartmentId
            setPendingDepartmentId(null)
            if (departmentId) addMutation.mutate({ departmentId, role: nextRole })
          }}
        />
      </CollapsedStrip>
    )
  }

  return (
    <S.Section id="departments">
      <S.SectionHeader>
        <S.SectionTitle>관련 기관</S.SectionTitle>
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
                {readOnly ? '없음' : '기관을 끌어 놓아 발령·주도로 지정'}
              </DepartmentFlowEmpty>
            ) : (
              <DepartmentFlowPillWrap>
                {issuerRelations.map((relation) => (
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
                    <span>
                      {relation.department.abbreviation || relation.department.name}
                    </span>
                    <DepartmentFlowPillRole>
                      {EVENT_DEPARTMENT_ROLE_LABEL[relation.role] ?? relation.role}
                    </DepartmentFlowPillRole>
                  </DepartmentFlowPill>
                ))}
              </DepartmentFlowPillWrap>
            )}
          </DepartmentFlowLane>

          <DepartmentFlowArrow aria-hidden>──▶</DepartmentFlowArrow>

          <DepartmentFlowCenter>
            <DepartmentFlowCenterBadge>★ 사건</DepartmentFlowCenterBadge>
            <DepartmentFlowCenterTitle>{event.title}</DepartmentFlowCenterTitle>
          </DepartmentFlowCenter>

          <DepartmentFlowArrow aria-hidden>──▶</DepartmentFlowArrow>

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
                {readOnly ? '없음' : '기관을 끌어 놓아 수령·집행으로 지정'}
              </DepartmentFlowEmpty>
            ) : (
              <DepartmentFlowPillWrap>
                {recipientRelations.map((relation) => (
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
                    <span>
                      {relation.department.abbreviation || relation.department.name}
                    </span>
                    <DepartmentFlowPillRole>
                      {EVENT_DEPARTMENT_ROLE_LABEL[relation.role] ?? relation.role}
                    </DepartmentFlowPillRole>
                  </DepartmentFlowPill>
                ))}
              </DepartmentFlowPillWrap>
            )}
          </DepartmentFlowLane>
        </DepartmentFlowBoard>
      )}

      {relations.length > 0 ? (
        <Rows>
          {relations.map((relation) => (
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
                  {!readOnly && <DragGrip aria-hidden title="드래그하여 위 역할 보드로 이동">⠿</DragGrip>}
                  <Name>{relation.department.name}</Name>
                  {relation.department.abbreviation && <Abbreviation>{relation.department.abbreviation}</Abbreviation>}
                  <RoleBadge
                    type="button"
                    disabled={readOnly}
                    onClick={() => setRoleEditing(relation)}
                    title={readOnly ? undefined : '역할 바꾸기'}
                  >
                    {EVENT_DEPARTMENT_ROLE_LABEL[relation.role] ?? relation.role}
                  </RoleBadge>
                </NameLine>
                <Meta>
                  {[DEPARTMENT_KIND_LABEL[relation.department.kind as keyof typeof DEPARTMENT_KIND_LABEL], affiliationOf(relation.department)]
                    .filter(Boolean)
                    .join(' · ')}
                </Meta>
                {readOnly ? (
                  relation.roleDescription && <Meta>{relation.roleDescription}</Meta>
                ) : (
                  <InlineText
                    value={relation.roleDescription ?? ''}
                    placeholder="무엇을 했나 (예: 국방군 지휘참모부가 기안)"
                    label={`${relation.department.name} 역할 상세`}
                    onSave={(next) =>
                      updateMutation.mutate({ relationId: relation.id, roleDescription: next.trim() || null })
                    }
                  />
                )}
              </Body>
              {!readOnly && (
                <RemoveButton
                  type="button"
                  onClick={() => void handleRemove(relation)}
                  aria-label={`${relation.department.name} 연결 끊기`}
                >
                  <FiX />
                </RemoveButton>
              )}
            </Row>
          ))}
        </Rows>
      ) : (
        <S.HelperText>
          지령·명령·법령처럼 국가 기관이 내리거나 받은 사건이면 그 기관을 잇습니다 — 예: 총통 지령 제21호 ← OKW가
          하달, OKH·OKL·OKM이 집행. 정당·기업·국제기구는 아래 &lsquo;관련 기업·조직&rsquo;에.
        </S.HelperText>
      )}

      {!readOnly && (
        <Actions>
          <ActionButton type="button" onClick={() => setPickerOpen(true)}>
            <FiPlus size={14} /> 기관 연결
          </ActionButton>
        </Actions>
      )}

      <SelectModal
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="연결할 국가 기관"
        options={departmentOptions}
        isLoading={isLoading}
        searchable
        searchPlaceholder="이름·원어명·약칭(OKW)으로 검색..."
        onSelect={(departmentId) => {
          setPickerOpen(false)
          setPendingDepartmentId(departmentId)
        }}
      />

      <SelectModal
        isOpen={pendingDepartmentId !== null || roleEditing !== null}
        onClose={() => {
          setPendingDepartmentId(null)
          setRoleEditing(null)
        }}
        title="이 사건에서의 역할"
        options={roleOptions}
        selectedValue={roleEditing?.role}
        onSelect={(role) => {
          const nextRole = role as EventDepartmentRoleValue
          if (roleEditing) {
            const relationId = roleEditing.id
            setRoleEditing(null)
            if (nextRole !== roleEditing.role) updateMutation.mutate({ relationId, role: nextRole })
            return
          }
          const departmentId = pendingDepartmentId
          setPendingDepartmentId(null)
          if (departmentId) addMutation.mutate({ departmentId, role: nextRole })
        }}
      />
    </S.Section>
  )
}

/* ───────────────────────── styles ───────────────────────── */

const CollapsedStrip = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 12px;
  padding: 10px 14px;
  margin-bottom: 16px;
  border-radius: ${RADIUS.MD};
  border: 1px dashed ${({ theme }) => theme.colors.border};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.015)' : 'rgba(15,23,42,0.015)'};
`

const CollapsedStripText = styled.span`
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.secondary};

  strong {
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const DepartmentFlowBoard = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(120px, 0.8fr) auto minmax(0, 1fr);
  align-items: stretch;
  gap: 8px;
  padding: 10px 12px;
  margin-bottom: 12px;
  border-radius: ${RADIUS.MD};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.025)' : 'rgba(15,23,42,0.02)'};

  @media (max-width: 640px) {
    grid-template-columns: minmax(0, 1fr);
  }
`

const DepartmentFlowLane = styled.div<{ $dragOver?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 10px;
  border-radius: ${RADIUS.SM};
  border: 1px dashed
    ${({ $dragOver, theme }) =>
      $dragOver ? theme.colors.primary : theme.colors.border};
  background: ${({ $dragOver, theme }) =>
    $dragOver
      ? `${theme.colors.primary}12`
      : theme.mode === 'dark'
        ? 'rgba(255,255,255,0.02)'
        : '#ffffff'};
  min-width: 0;
  transition: border-color 0.14s ease, background 0.14s ease;
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
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.primary};
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
  padding: 8px 10px;
  border-radius: ${RADIUS.SM};
  border: 1.5px solid ${({ theme }) => theme.colors.primary};
  background: ${({ theme }) => `${theme.colors.primary}10`};
  text-align: center;
  min-width: 0;
`

const DepartmentFlowCenterBadge = styled.span`
  font-size: 10px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.primary};
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
  font-size: 13px;
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
`

const ActionButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 12px;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  border-radius: ${RADIUS.SM};
  background: transparent;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    border-color: ${({ theme }) => theme.colors.text.secondary};
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
