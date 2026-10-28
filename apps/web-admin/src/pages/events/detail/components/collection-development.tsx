import { type DragEvent, type ReactNode, Suspense, lazy, useMemo, useState } from 'react'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { FiLayers, FiLink2, FiPlus } from 'react-icons/fi'
import { MdDragIndicator } from 'react-icons/md'
import { Link } from 'react-router-dom'
import styled from 'styled-components'

import {
  RADIUS,
  ledgerAccent,
  ledgerAccentSubtle,
  ledgerBackground,
  ledgerHairline,
  ledgerHairlineStrong,
} from '@/entities/event/ui/ledger-tokens'
import { eventDomainDef } from '@/entities/event/model/event-domain'
import { metaText } from '@/pages/events/styles/theme'
import { formatDateRange } from '@/pages/events/utils/events.utils'
import { type UpdateEventDto, updateEvent } from '@/shared/api/events'
import { getEventOverview } from '@/shared/api/event-overview'
import { eventKeys } from '@/shared/api/event-query-keys'
import { invalidateEventQueries } from '@/shared/api/invalidate-events'
import { pathKeys } from '@/shared/router'
import { InlineText } from '@/shared/ui/inline-edit'
import { notify } from '@/shared/ui/toast'

import * as S from '../styles'
import { type EventDetail, usePrefetchEventDetail } from '../use-event-detail'
import { PHASE_LABEL, groupByPhase } from './collection-development.lib'
import { CollectionFooter, ExpandToggle, KindSwitch, RegroupBar, createCollectionWith } from './collection-regroup'
import { compareEventStart, crossPatchErrorMessage } from './detail-network.lib'
import {
  type DropAction,
  type TreeNode,
  type TreeSource,
  buildEventTree,
  dropActionFor,
  indexTree,
  subtreeIds,
} from './development-tree.lib'

const LazyEventRegisterModal = lazy(() =>
  import('@/widgets/event-form/ui/event-register-modal').then((module) => ({
    default: module.EventRegisterModal,
  })),
)

interface CollectionDevelopmentProps {
  event: EventDetail
  onPatch: (patch: UpdateEventDto, opts?: { savedLabel?: string }) => void
  /** 기존 사건을 하위로 모으기 — 연관 탭의 '하위 사건 모으기'로 보낸다 */
  onGatherExisting: () => void
}

/**
 * 묶음 사건의 전개 — **하위 사건이 곧 전개다.**
 *
 * 묶음 사건은 전개를 글로 쓰지 않는다(서버가 전개 단락을 거부한다). 전쟁의 경과는 전투·회담·
 * 조약 같은 하위 사건이 차례로 쌓여 드러나고, 이 섹션은 그 차례를 읽는 자리다. 배경과 여파
 * 사이, 단일 사건이라면 전개 단락이 놓였을 바로 그 자리에 선다.
 *
 * 하위가 하나도 없으면 첫 하위 등록을 권하고, 그때만 '단일 사건으로' 되돌릴 수 있다
 * (하위가 남은 묶음은 서버가 단일 전환을 거부한다).
 */
export function CollectionDevelopment({ event, onPatch, onGatherExisting }: CollectionDevelopmentProps) {
  const queryClient = useQueryClient()
  const prefetchEvent = usePrefetchEventDetail()
  const [createOpen, setCreateOpen] = useState(false)
  /** 요약을 쓰는 중인 하위 — 공용 인라인 칸은 연필 버튼(호버)으로만 열려, 빈 안내문을 눌러도 아무 일이 없었다 */
  const [writingSummaryId, setWritingSummaryId] = useState<string | null>(null)
  /** 접은 묶음 — 기본은 전부 펼친다('모든 사건을 본다'). 접은 것만 기억한다 */
  const [collapsedIds, setCollapsedIds] = useState<ReadonlySet<string>>(() => new Set())
  /** 골라서 묶기 — 켜면 번호 자리가 고르기 칸이 되고 아래에 묶기 막대가 붙는다 */
  const [selecting, setSelecting] = useState(false)
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(() => new Set())
  /** 하위 사건 등록 모달의 상위 — 기본은 이 사건, 묶음의 '이 묶음에 하위 추가'면 그 묶음 */
  const [createUnder, setCreateUnder] = useState<{ id: string; title: string } | null>(null)
  /** 끌어다 놓기 — 끄는 중인 사건, 지금 가리키는 자리와 그 결과 */
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dropHint, setDropHint] = useState<{ targetId: string; action: DropAction } | null>(null)
  /** 개별 위에 놓아 새 묶음을 만들 때 — 이름을 받는 줄이 놓인 사건 아래에 열린다 */
  const [groupPrompt, setGroupPrompt] = useState<{ draggedId: string; withId: string; parentId: string } | null>(null)
  const [busy, setBusy] = useState(false)

  const toggleIn = (set: ReadonlySet<string>, id: string) => {
    const next = new Set(set)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return next
  }
  const stopSelecting = () => {
    setSelecting(false)
    setSelectedIds(new Set())
  }

  /**
   * 하위의 하위까지 — 조망 API가 주 상위 계보 전부를 준다(이 사건 상세 응답엔 직계뿐). 받기 전엔 직계로 그린다.
   * 조망은 ['events'] 아래 키라 하위를 고칠 때마다(invalidateEventQueries) 함께 다시 받는다.
   */
  const { data: overview } = useQuery({
    queryKey: eventKeys.overview(event.id),
    queryFn: () => getEventOverview(event.id),
    staleTime: 0,
  })
  const kindById = useMemo(
    () => new Map((event.childEvents ?? []).map((child) => [child.id, child.kind === 'COLLECTION' ? 'COLLECTION' as const : 'SINGLE' as const])),
    [event.childEvents],
  )
  const tree = useMemo<TreeRow[]>(() => {
    const sources: TreeSource[] = overview
      ? [overview.root, ...overview.descendants].map((node) => ({
          id: node.id,
          title: node.title,
          description: node.description,
          parentEventId: node.parentEventId,
          startDate: node.startDate,
          startDatePrecision: node.startDatePrecision,
          endDate: node.endDate,
          endDatePrecision: node.endDatePrecision,
          domain: node.domain,
          /* 조망 노드 kind가 정본 — API가 아직 옛 빌드면 비어 오고, 그땐 lib가 하위 유무로 판별 */
          kind: node.kind ?? null,
        }))
      : (event.childEvents ?? []).map((child) => ({
          id: child.id,
          title: child.title,
          description: child.description ?? null,
          parentEventId: event.id,
          startDate: child.startDate ?? null,
          startDatePrecision: child.startDatePrecision ?? null,
          endDate: child.endDate ?? null,
          endDatePrecision: child.endDatePrecision ?? null,
          domain: (child.domain as string | undefined) ?? null,
          kind: child.kind === 'COLLECTION' ? 'COLLECTION' : 'SINGLE',
        }))
    const owned: TreeRow[] = buildEventTree(event.id, sources, kindById)
    /* 추가 상위로만 이어진 하위 — 조망(주 상위 계보)에 없다. 이 묶음 소유가 아니라 읽기만 */
    const extras: TreeRow[] = (event.extraChildren ?? [])
      .filter((child) => !owned.some((node) => node.id === child.id))
      .map((child) => ({
        id: child.id,
        title: child.title,
        description: null,
        parentEventId: null,
        startDate: child.startDate ?? null,
        startDatePrecision: child.startDatePrecision ?? null,
        endDate: child.endDate ?? null,
        endDatePrecision: child.endDatePrecision ?? null,
        domain: null,
        children: [],
        isCollection: false,
        depth: 1,
        viaExtraLink: true,
      }))
    return [...owned, ...extras].sort((first, second) => compareEventStart(first.startDate, second.startDate))
  }, [overview, event.id, event.childEvents, event.extraChildren, kindById])

  const index = useMemo(() => indexTree(tree), [tree])
  const totalCount = index.size
  const directCount = tree.length
  const truncated = overview?.truncated ?? false

  /** 상위 기간에 비춘 구획(직계만) — 하나뿐이면(보통 전부 '기간 중') 구획 머리를 그리지 않는다 */
  const groups = useMemo(() => groupByPhase(tree, event), [tree, event])
  const showPhaseHeads = groups.length > 1

  /**
   * 하위 사건의 한 줄 요약을 여기서 바로 — 나누기로 만든 하위는 개요가 비어 제목만 남았다(13건).
   * 하위 사건 자신의 PUT이라 상위 캐시와 그 하위 상세를 함께 무효화한다.
   */
  const saveChildDescription = async (childId: string, next: string) => {
    try {
      await updateEvent(childId, { description: next })
      setWritingSummaryId(null)
      invalidateEventQueries(queryClient, { eventId: event.id })
      invalidateEventQueries(queryClient, { eventId: childId })
    } catch (error) {
      notify.error(`요약을 저장하지 못했습니다 — ${crossPatchErrorMessage(error)}`)
    }
  }

  const becomeSingle = () =>
    onPatch({ kind: 'SINGLE' } as UpdateEventDto, {
      savedLabel: `'${event.title}'을(를) 단일 사건으로 바꿈`,
    })

  /* ── 끌어다 놓기 ── */

  const titleOf = (id: string) => (id === event.id ? event.title : (index.get(id)?.title ?? '사건'))

  const endDrag = () => {
    setDraggingId(null)
    setDropHint(null)
  }

  const actionAt = (targetId: string | 'root'): DropAction | null => {
    const dragged = draggingId ? index.get(draggingId) : undefined
    if (!dragged) return null
    const target = targetId === 'root' ? 'root' : index.get(targetId)
    if (!target || (target !== 'root' && (target as TreeRow).viaExtraLink)) return null
    return dropActionFor(dragged, target, event.id)
  }

  const moveUnder = async (id: string, parentId: string) => {
    const previousParent = index.get(id)?.parentEventId ?? null
    setBusy(true)
    try {
      await updateEvent(id, { parentEventId: parentId } as UpdateEventDto)
      notify.success(`'${titleOf(id)}'을(를) '${titleOf(parentId)}' 밑으로 옮겼습니다`)
    } catch (error) {
      notify.error(`옮기지 못했습니다 — ${crossPatchErrorMessage(error)}`)
    } finally {
      for (const eventId of new Set([event.id, id, parentId, previousParent].filter(Boolean) as string[])) {
        invalidateEventQueries(queryClient, { eventId })
      }
      setBusy(false)
    }
  }

  const dropOn = (targetId: string | 'root') => {
    const action = actionAt(targetId)
    const draggedId = draggingId
    endDrag()
    if (!action || !draggedId) return
    if (action.type === 'move') {
      void moveUnder(draggedId, action.parentId)
    } else {
      /* 개별 위 — 둘을 묶을 새 묶음의 이름부터 받는다(놓인 사건 아래에 입력 줄) */
      setGroupPrompt({ draggedId, withId: action.withId, parentId: action.parentId })
    }
  }

  const submitGroup = async (name: string) => {
    if (!groupPrompt || !name.trim()) return
    const members = [groupPrompt.withId, groupPrompt.draggedId]
      .map((id) => index.get(id))
      .filter((node): node is TreeRow => Boolean(node))
    const previousParents = members.map((member) => member.parentEventId).filter(Boolean) as string[]
    setBusy(true)
    try {
      const created = await createCollectionWith({
        parentId: groupPrompt.parentId,
        title: name.trim(),
        members,
        domain: event.domain,
      })
      notify.success(`'${members.map((member) => member.title).join("'·'")}'을(를) 새 묶음 '${created.title}'으로 묶었습니다`)
      setGroupPrompt(null)
    } catch (error) {
      notify.error(`묶지 못했습니다 — ${crossPatchErrorMessage(error)}`)
    } finally {
      for (const eventId of new Set([event.id, groupPrompt.parentId, ...previousParents, ...members.map((member) => member.id)])) {
        invalidateEventQueries(queryClient, { eventId })
      }
      setBusy(false)
    }
  }

  /** 끌어다 놓기 대상 하나 — 행과 루트 띠가 같이 쓴다 */
  const dropTargetProps = (targetId: string | 'root') => ({
    onDragOver: (dragEvent: DragEvent<HTMLElement>) => {
      if (!draggingId) return
      dragEvent.stopPropagation()
      const action = actionAt(targetId)
      if (!action) {
        dragEvent.dataTransfer.dropEffect = 'none'
        return
      }
      dragEvent.preventDefault()
      dragEvent.dataTransfer.dropEffect = 'move'
      if (dropHint?.targetId !== targetId || dropHint.action.type !== action.type) setDropHint({ targetId, action })
    },
    onDragLeave: (dragEvent: DragEvent<HTMLElement>) => {
      /* 자식 요소로 들어간 것은 떠난 게 아니다 */
      if (dragEvent.currentTarget.contains(dragEvent.relatedTarget as Node | null)) return
      if (dropHint?.targetId === targetId) setDropHint(null)
    },
    onDrop: (dragEvent: DragEvent<HTMLElement>) => {
      dragEvent.preventDefault()
      dragEvent.stopPropagation()
      dropOn(targetId)
    },
  })

  const dropLabel = (action: DropAction) =>
    action.type === 'move'
      ? `'${titleOf(action.parentId)}' 밑으로 옮기기`
      : `'${titleOf(action.withId)}'와(과) 새 묶음으로 묶기`

  /* ── 한 행(재귀) ── */

  const renderRow = (node: TreeRow, ordinal: string): ReactNode => {
    const owned = !node.viaExtraLink
    const collapsed = collapsedIds.has(node.id)
    const checked = selectedIds.has(node.id)
    const hint = dropHint?.targetId === node.id ? dropHint.action : null
    const dateLabel = node.startDate
      ? formatDateRange(node.startDate, node.endDate ?? undefined, node.startDatePrecision, node.endDatePrecision)
      : null
    const domain = node.domain ? eventDomainDef(node.domain) : null
    const nested = node.depth > 1
    return (
      <Step
        key={node.id}
        $nested={nested}
        data-selected={checked || undefined}
        data-drop={hint?.type}
        data-dragging={draggingId === node.id || undefined}
        {...(owned && draggingId ? dropTargetProps(node.id) : {})}
      >
        {selecting && owned ? (
          <StepCheck>
            <input
              type="checkbox"
              checked={checked}
              onChange={() => setSelectedIds((prev) => toggleIn(prev, node.id))}
              aria-label={`${node.title} 고르기`}
            />
          </StepCheck>
        ) : owned ? (
          /* 번호 자리가 손잡이 — 손이 닿으면 번호가 ⋮⋮로 바뀌고 그걸 끌어 옮긴다 */
          <StepHandle
            draggable
            title="끌어서 다른 묶음 밑으로 옮기거나, 개별 사건 위에 놓아 함께 묶기"
            aria-label={`${node.title} 끌어 옮기기`}
            onDragStart={(dragEvent) => {
              dragEvent.dataTransfer.effectAllowed = 'move'
              dragEvent.dataTransfer.setData('text/plain', node.id)
              const row = (dragEvent.currentTarget as HTMLElement).closest('li')
              if (row) dragEvent.dataTransfer.setDragImage(row, 16, 16)
              setDraggingId(node.id)
              setGroupPrompt(null)
            }}
            onDragEnd={endDrag}
          >
            <StepIndex aria-hidden data-index>{ordinal}</StepIndex>
            <GripIcon aria-hidden data-grip />
          </StepHandle>
        ) : (
          <StepIndex aria-hidden>{ordinal}</StepIndex>
        )}
        <StepBody>
          <StepHead>
            <StepTitle
              to={pathKeys.events.detail(node.id)}
              viewTransition
              draggable={false}
              $nested={nested}
              onMouseEnter={() => prefetchEvent(node.id)}
              onFocus={() => prefetchEvent(node.id)}
            >
              {node.title}
            </StepTitle>
            <StepMeta>
              <span>{dateLabel ?? '날짜 미상'}</span>
              {domain && (
                <DomainMeta>
                  <domain.Icon aria-hidden />
                  {domain.label}
                </DomainMeta>
              )}
              {node.isCollection && (
                <ExpandToggle
                  expanded={!collapsed}
                  count={node.children.length}
                  title={node.title}
                  onToggle={() => setCollapsedIds((prev) => toggleIn(prev, node.id))}
                />
              )}
              {node.viaExtraLink && <span>추가 상위로 연결</span>}
            </StepMeta>
            {owned && !selecting && !draggingId && (
              <StepTools>
                <KindSwitch parentId={node.parentEventId ?? event.id} child={node} />
              </StepTools>
            )}
          </StepHead>
          {hint && <DropLabel role="status">{dropLabel(hint)}</DropLabel>}
          {/* 있는 요약은 한 줄로 읽기만 — 비어 있을 때만 여기서 쓴다. 추가 상위로만 이어진 하위는 쓰기를 열지 않는다 */}
          {node.description?.trim() ? (
            <StepText>{node.description}</StepText>
          ) : !owned || nested ? null : writingSummaryId === node.id ? (
            <StepSummary>
              <InlineText
                value=""
                autoEdit
                onSave={(next) => void saveChildDescription(node.id, next)}
                placeholder="한 줄 요약 — 무슨 일이었나"
                label={`${node.title} 요약`}
                multiline
                minRows={2}
              />
            </StepSummary>
          ) : (
            <SummaryPrompt type="button" onClick={() => setWritingSummaryId(node.id)}>
              + 한 줄 요약 쓰기
            </SummaryPrompt>
          )}
          {groupPrompt?.withId === node.id && (
            <GroupPromptForm
              onSubmit={(submitEvent) => {
                submitEvent.preventDefault()
                const field = submitEvent.currentTarget.elements.namedItem('group-name') as HTMLInputElement | null
                void submitGroup(field?.value ?? '')
              }}
            >
              <GroupPromptText>
                '{titleOf(groupPrompt.draggedId)}'와(과) 함께 묶을 새 묶음 이름
              </GroupPromptText>
              <GroupPromptInput name="group-name" autoFocus placeholder="예: 7월 위기" aria-label="새 묶음 이름" disabled={busy} />
              <GroupPromptSubmit type="submit" disabled={busy}>
                묶기
              </GroupPromptSubmit>
              <GroupPromptCancel type="button" onClick={() => setGroupPrompt(null)} disabled={busy}>
                취소
              </GroupPromptCancel>
            </GroupPromptForm>
          )}
          {node.isCollection && !collapsed && (
            <NestedSteps>
              {node.children.map((child, childIndex) => renderRow(child, String(childIndex + 1)))}
              <NestedFooterItem>
                <CollectionFooter
                  collection={{ id: node.id, title: node.title, childIds: node.children.map((child) => child.id) }}
                  liftTo={node.parentEventId ?? event.id}
                  rootId={event.id}
                  onAddUnder={() => setCreateUnder({ id: node.id, title: node.title })}
                />
              </NestedFooterItem>
            </NestedSteps>
          )}
        </StepBody>
      </Step>
    )
  }

  const allOwned = useMemo(() => [...index.values()].filter((node) => !(node as TreeRow).viaExtraLink), [index])

  return (
    <S.Section id="narrative" aria-busy={busy}>
      <S.SectionHeader>
        <S.SectionTitle>전개</S.SectionTitle>
        <S.SectionSubtitle>
          {directCount === 0
            ? '하위 사건으로 기록'
            : totalCount > directCount
              ? `하위 사건 ${directCount}건 · 그 아래까지 ${totalCount}건`
              : `하위 사건 ${directCount}건`}
        </S.SectionSubtitle>
      </S.SectionHeader>

      {directCount === 0 ? (
        <Empty>
          <EmptyText>
            아직 하위 사건이 없습니다. 묶음 사건의 전개는 전투·회담·조약 같은 국면을 하위 사건으로
            등록해 차례로 쌓습니다.
          </EmptyText>
          <EmptyActions>
            <S.TabEmptyAction type="button" onClick={() => setCreateOpen(true)}>
              <FiPlus aria-hidden />첫 하위 사건 등록
            </S.TabEmptyAction>
            <TextButton type="button" onClick={onGatherExisting}>
              이미 있는 사건을 모으기
            </TextButton>
            <TextButton type="button" onClick={becomeSingle}>
              하위 없이 쓸 사건이면 단일 사건으로
            </TextButton>
          </EmptyActions>
        </Empty>
      ) : (
        <Phases>
          {/* 끄는 동안에만 — 여기 놓으면 이 사건 바로 밑(묶음에서 꺼내기) */}
          {draggingId && (
            <RootDrop
              data-active={dropHint?.targetId === 'root' || undefined}
              data-disabled={!actionAt('root') || undefined}
              {...dropTargetProps('root')}
            >
              {actionAt('root')
                ? `여기에 놓으면 '${event.title}' 바로 밑으로`
                : `이미 '${event.title}' 바로 밑에 있습니다`}
            </RootDrop>
          )}
          {groups.map((group) => (
            <PhaseGroup key={group.phase} aria-label={showPhaseHeads ? PHASE_LABEL[group.phase] : undefined}>
              {showPhaseHeads && (
                <PhaseHead>
                  {PHASE_LABEL[group.phase]}
                  <PhaseCount>{group.items.length}</PhaseCount>
                </PhaseHead>
              )}
              <Steps>
                {group.items.map((node) => {
                  /* 번호는 구획을 넘어 이어지는 직계 차례(1·2·3…) — 구획마다 다시 1부터면 몇 번째 국면인지 흐려진다 */
                  return renderRow(node, String(tree.indexOf(node) + 1))
                })}
              </Steps>
            </PhaseGroup>
          ))}
          {truncated && <TruncatedNote>하위가 너무 많아 일부만 보입니다 — 묶음 상세에서 나머지를 보세요.</TruncatedNote>}
          {/*
           * 다음 차례 — 추가는 목록 **끝**에 선다. 번호 열에 '+' 노드를 세워 목록의 다음 줄처럼 읽히게 한다.
           */}
          {selecting ? (
            <RegroupBar
              parent={{ id: event.id, domain: event.domain }}
              selected={allOwned.filter((node) => selectedIds.has(node.id))}
              candidates={allOwned.filter(
                (node) =>
                  node.isCollection &&
                  /* 고른 것의 하위 묶음으로는 못 옮긴다(순환) */
                  ![...selectedIds].some((id) => {
                    const picked = index.get(id)
                    return picked ? subtreeIds(picked).has(node.id) : false
                  }),
              )}
              onDone={stopSelecting}
              onCancel={stopSelecting}
            />
          ) : (
            <NextStep>
              <AddChildRow type="button" onClick={() => setCreateOpen(true)}>
                <NextStepNode aria-hidden>
                  <FiPlus />
                </NextStepNode>
                <AddChildText>
                  <AddChildTitle>하위 사건 추가</AddChildTitle>
                  <AddChildHint>{directCount + 1}번째 국면 — 전투·회담·조약을 차례 끝에</AddChildHint>
                </AddChildText>
              </AddChildRow>
              <NextStepTools>
                {allOwned.length > 0 && (
                  <GatherButton type="button" onClick={() => setSelecting(true)}>
                    <FiLayers aria-hidden />
                    골라서 묶기
                  </GatherButton>
                )}
                <GatherButton type="button" onClick={onGatherExisting}>
                  <FiLink2 aria-hidden />
                  기존 사건 모으기
                </GatherButton>
              </NextStepTools>
            </NextStep>
          )}
          {!selecting && allOwned.length > 1 && (
            <DragHint>번호를 끌어 다른 묶음 위에 놓으면 그 밑으로, 개별 사건 위에 놓으면 둘을 새 묶음으로 묶습니다.</DragHint>
          )}
        </Phases>
      )}

      {(createOpen || createUnder) && (
        <Suspense fallback={null}>
          <LazyEventRegisterModal
            isOpen
            onClose={() => {
              setCreateOpen(false)
              setCreateUnder(null)
            }}
            initialParent={createUnder ?? { id: event.id, title: event.title }}
            onSaved={() => {
              invalidateEventQueries(queryClient, { eventId: event.id })
              if (createUnder) invalidateEventQueries(queryClient, { eventId: createUnder.id })
            }}
          />
        </Suspense>
      )}
    </S.Section>
  )
}

/** 직계·손자 행 — 상세 응답 하위(추가 상위 연결 표지 포함) */
type TreeRow = TreeNode & { viaExtraLink?: boolean; children: TreeRow[] }

/**
 * 목록 끝 '다음 차례' 줄 — **비어 있는 다음 행**처럼 생겼다.
 *
 * 하위 사건 행(Step)과 같은 격자(번호 28px + 본문)·같은 세로 리듬이라, 번호 자리엔 강조색 '+' 노드,
 * 제목 자리엔 '하위 사건 추가'와 몇 번째 국면이 될지가 선다. 줄 전체가 누르는 자리(hover 면)이고,
 * 이미 있는 사건을 끌어오는 '모으기'는 같은 줄 오른쪽 끝의 보조 버튼이다.
 * 위 머리카락선은 마지막 행의 아래선이 맡고, 이 줄은 점선 아래선으로 '아직 비어 있는 자리'를 말한다.
 */
const NextStep = styled.div`
  display: flex;
  align-items: center;
  gap: 8px 12px;
  max-width: ${S.PROSE_WIDTH}px;
  /* Phases의 구획 간격(20px)을 되돌려 마지막 행에 붙인다 — 떨어져 있으면 목록 밖의 별도 버튼으로 읽힌다 */
  margin-top: -20px;
  border-bottom: 1px dashed ${({ theme }) => ledgerHairlineStrong(theme.mode)};

  /* 좁은 지면 — 추가 줄은 한 줄을 다 쓰고, 모으기는 그 아래 제목 열에서 시작(나란히 두면 설명이 낱말 중간에 꺾였다) */
  @container eventdetail (max-width: 639px) {
    flex-wrap: wrap;
  }
`

/** 줄 오른쪽 보조 동작 묶음 — 좁은 지면에선 아래 줄 제목 열에서 시작 */
const NextStepTools = styled.span`
  display: inline-flex;
  flex-wrap: wrap;
  gap: 6px;

  @container eventdetail (max-width: 639px) {
    margin: -4px 0 10px 40px;
  }
`

const AddChildRow = styled.button`
  flex: 1;
  min-width: 0;
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr);
  /* 노드는 제목 첫 줄에 — 설명이 둘째 줄로 내려가도 '+'가 가운데로 끌려 내려가지 않게 */
  align-items: start;
  gap: 12px;
  /* 좌우 8px 안쪽 여백만큼 바깥으로 — 번호 열·제목 열이 위 행들과 같은 x에 선다 */
  margin: 0 0 0 -8px;
  padding: 10px 8px;
  border: none;
  border-radius: ${RADIUS.SM};
  background: transparent;
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: background 0.14s;

  @container eventdetail (max-width: 639px) {
    flex-basis: 100%;
  }

  &:hover {
    background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: -2px;
  }
`

/** 번호 자리의 '+' — 번호(우측 정렬)와 같은 오른쪽 끝, 강조색 면 원. hover에 채워진다 */
const NextStepNode = styled.span`
  justify-self: end;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  /* 제목 줄 상자(15px × 1.45 ≈ 22px)와 같은 높이 — 첫 줄 가운데에 선다 */
  margin-top: 0;
  border-radius: 50%;
  background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  transition:
    background 0.14s,
    color 0.14s;

  svg {
    width: 13px;
    height: 13px;
    stroke-width: 2.5;
  }

  ${AddChildRow}:hover & {
    background: ${({ theme }) => ledgerAccent(theme.mode)};
    /* 채운 면의 전경은 지면색 — 다크 강조색은 밝은 인디고라 흰 글자가 묻힌다(ledger 규약) */
    color: ${({ theme }) => ledgerBackground(theme.mode)};
  }
`

const AddChildText = styled.span`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 2px 10px;
  min-width: 0;
`

/** 행 제목(15px·700)과 같은 단 — 강조색이 '아직 없는 행'임을 말한다 */
const AddChildTitle = styled.span`
  font-size: 15px;
  font-weight: 700;
  line-height: 1.45;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
`

/** 행의 날짜·분야 줄과 같은 단(12px·metaText) */
const AddChildHint = styled.span`
  font-size: 12px;
  color: ${metaText};
  word-break: keep-all;
`

/** 보조 동작 — 이미 있는 사건을 이 묶음으로(연관 탭의 모으기). 테두리 알약, 줄 오른쪽 끝 */
const GatherButton = styled.button`
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 11px;
  border-radius: ${RADIUS.PILL};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: transparent;
  font: inherit;
  font-size: 12.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  transition:
    color 0.14s,
    border-color 0.14s;

  svg {
    width: 13px;
    height: 13px;
  }
  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    border-color: ${({ theme }) => theme.colors.text.tertiary};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 2px;
  }
`

const Empty = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: ${S.PROSE_WIDTH}px;
`

const EmptyText = styled.p`
  margin: 0;
  font-size: 15px;
  line-height: 1.7;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const EmptyActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 14px;
`

const TextButton = styled.button`
  padding: 4px 0;
  border: none;
  background: none;
  font: inherit;
  font-size: 12.5px;
  color: ${metaText};
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 2px;
  }
`

/** 하위 사건 차례 — 번호 열 + 본문. 행 사이 머리카락선으로만 가른다(카드·색띠 없음). */
const Steps = styled.ol`
  display: flex;
  flex-direction: column;
  max-width: ${S.PROSE_WIDTH}px;
  margin: 0;
  padding: 0;
  list-style: none;
`

const Step = styled.li<{ $nested?: boolean }>`
  position: relative;
  display: grid;
  grid-template-columns: ${({ $nested }) => ($nested ? '22px' : '28px')} minmax(0, 1fr);
  gap: ${({ $nested }) => ($nested ? 8 : 12)}px;
  padding: ${({ $nested }) => ($nested ? '6px 0' : '9px 0')};
  border-radius: ${RADIUS.SM};
  transition: background 0.12s, box-shadow 0.12s, opacity 0.12s;
  border-top: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};

  &:last-child {
    border-bottom: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  }

  /* 고른 행 — 강조색 옅은 면(고르기 중에만 생긴다) */
  &[data-selected] {
    background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  }

  /* 끄는 중인 행 — 흐리게(어디서 왔는지는 남긴다) */
  &[data-dragging] {
    opacity: 0.4;
  }

  /*
   * 놓을 자리 — 묶음 밑으로(into)는 실선 테두리 + 옅은 면, 새 묶음(group)은 점선 테두리.
   * 테두리는 inset 그림자라 레이아웃이 밀리지 않는다.
   */
  &[data-drop='move'] {
    background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
    box-shadow: inset 0 0 0 2px ${({ theme }) => ledgerAccent(theme.mode)};
  }
  &[data-drop='group'] {
    box-shadow: inset 0 0 0 2px ${({ theme }) => ledgerAccentSubtle(theme.mode)};
    outline: 2px dashed ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: -2px;
  }
`

/** 번호 자리 = 끌기 손잡이. 손이 닿으면 번호가 ⋮⋮로 바뀐다(끌 수 있음을 그 자리에서 말한다) */
const StepHandle = styled.span`
  display: flex;
  justify-content: flex-end;
  align-items: flex-start;
  cursor: grab;
  touch-action: none;
  user-select: none;

  &:active {
    cursor: grabbing;
  }

  [data-grip] {
    display: none;
  }
  li:hover:not(:has(li:hover)) > & [data-index],
  &:focus-visible [data-index] {
    display: none;
  }
  li:hover:not(:has(li:hover)) > & [data-grip],
  &:focus-visible [data-grip] {
    display: block;
  }
`

const GripIcon = styled(MdDragIndicator)`
  width: 16px;
  height: 16px;
  margin-top: 1px;
  color: ${metaText};
`

/** 놓을 자리의 결과 한 줄 — '‘7월 위기’ 밑으로 옮기기' */
const DropLabel = styled.span`
  align-self: flex-start;
  margin-top: 2px;
  padding: 1px 8px;
  border-radius: ${RADIUS.PILL};
  background: ${({ theme }) => ledgerAccent(theme.mode)};
  color: ${({ theme }) => ledgerBackground(theme.mode)};
  font-size: 11.5px;
  font-weight: 700;
`

/** 손자 목록 — 행 본문 열 안쪽, 왼쪽 세로선 하나로 '이 묶음 밑'임을 말한다 */
const NestedSteps = styled.ol`
  display: flex;
  flex-direction: column;
  margin: 6px 0 2px;
  padding: 0 0 0 10px;
  list-style: none;
  border-left: 2px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};

  > li + li {
    border-top: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  }
`

const NestedFooterItem = styled.li`
  padding: 6px 0 2px;
`

/** 끄는 동안 목록 위에 뜨는 띠 — 여기 놓으면 이 사건 바로 밑(묶음에서 꺼내기) */
const RootDrop = styled.div`
  max-width: ${S.PROSE_WIDTH}px;
  padding: 10px 14px;
  border-radius: ${RADIUS.SM};
  border: 2px dashed ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  text-align: center;
  transition: background 0.12s, border-color 0.12s, color 0.12s;

  &[data-active] {
    border-color: ${({ theme }) => ledgerAccent(theme.mode)};
    background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
    color: ${({ theme }) => ledgerAccent(theme.mode)};
  }
  &[data-disabled] {
    opacity: 0.5;
  }
`

/** 개별 위에 놓아 새 묶음 — 이름을 받는 줄(놓인 사건 아래) */
const GroupPromptForm = styled.form`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 8px;
  margin-top: 6px;
  padding: 8px 10px;
  border-radius: ${RADIUS.SM};
  background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
`

const GroupPromptText = styled.span`
  flex-basis: 100%;
  font-size: 12.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
`

const GroupPromptInput = styled.input`
  flex: 1 1 180px;
  min-width: 0;
  padding: 6px 10px;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => ledgerBackground(theme.mode)};
  font: inherit;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.primary};
`

const GroupPromptSubmit = styled.button`
  padding: 6px 12px;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => ledgerAccent(theme.mode)};
  background: ${({ theme }) => ledgerAccent(theme.mode)};
  color: ${({ theme }) => ledgerBackground(theme.mode)};
  font: inherit;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;

  &:disabled {
    opacity: 0.5;
    cursor: progress;
  }
`

const GroupPromptCancel = styled.button`
  padding: 6px 4px;
  border: none;
  background: none;
  font: inherit;
  font-size: 12.5px;
  color: ${metaText};
  cursor: pointer;
`

const TruncatedNote = styled.p`
  margin: -8px 0 0;
  font-size: 12.5px;
  color: ${metaText};
`

/** 끌기가 된다는 것을 한 번 말하는 줄 — 목록 끝 다음 차례 줄 아래 */
const DragHint = styled.p`
  max-width: ${S.PROSE_WIDTH}px;
  margin: -12px 0 0;
  font-size: 12px;
  color: ${metaText};
  word-break: keep-all;
`

/** 고르기 칸 — 번호 자리(28px)에 오른쪽 정렬 */
const StepCheck = styled.label`
  display: flex;
  justify-content: flex-end;
  padding-top: 3px;

  input {
    width: 15px;
    height: 15px;
    margin: 0;
    accent-color: ${({ theme }) => ledgerAccent(theme.mode)};
    cursor: pointer;
  }
`

/**
 * 행 도구(개별|묶음) — 머리 줄 오른쪽 끝. 손이 닿을 때만 보인다(18행 모두에 상시면 목록이 도구로 덮인다).
 * 지금 묶음인 행은 날짜 줄의 '하위' 펼침 단추가 종류를 늘 말한다.
 */
const StepTools = styled.span`
  /* 흐름 밖(행 오른쪽 위에 겹침) — 흐름 안이면 숨어 있어도 긴 제목 줄에서 밀려 빈 둘째 줄을 만들었다 */
  position: absolute;
  top: 6px;
  right: 0;
  z-index: 1;
  /* 겹쳐 뜨므로 지면색 받침 — 밑의 날짜 글자가 비치지 않게 */
  padding-left: 8px;
  background: ${({ theme }) => ledgerBackground(theme.mode)};
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.14s;

  /* 가장 안쪽 행에만 — 손자 행에 손이 닿으면 그 부모 행도 :hover라 도구가 겹겹이 떴다 */
  li:hover:not(:has(li:hover)) > div > div > &,
  div:focus-within > & {
    opacity: 1;
    pointer-events: auto;
  }
  /* 손이 닿는 순간이 없는 터치 환경 — 상시 보이되 흐름 안으로(겹쳐 두면 글자를 가린다) */
  @media (hover: none) {
    position: static;
    margin-left: auto;
    padding-left: 0;
    background: none;
    opacity: 1;
    pointer-events: auto;
  }
`

const StepIndex = styled.span`
  padding-top: 1px;
  font-size: 12px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  text-align: right;
  color: ${metaText};
`

const StepBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`

/** 제목 + 날짜·분야 한 줄 — 좁으면 날짜가 다음 줄로 내려간다 */
const StepHead = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 2px 12px;
`

const StepMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 10px;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  color: ${metaText};
`

/** 분야 — 아이콘 + 이름. 예전 글자 글리프(⚔·✚)는 12px에서 '✕'·'+'로 읽혀 지우기·추가 버튼처럼 보였다 */
const DomainMeta = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 3px;

  svg {
    width: 11px;
    height: 11px;
  }
`


const StepTitle = styled(Link)<{ $nested?: boolean }>`
  font-size: ${({ $nested }) => ($nested ? 14 : 15)}px;
  font-weight: 700;
  line-height: 1.45;
  color: ${({ theme }) => theme.colors.text.primary};
  text-decoration: none;
  overflow-wrap: anywhere;

  &:hover {
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 2px;
    border-radius: 2px;
  }
`

const StepText = styled.p`
  margin: 0;
  font-size: 13.5px;
  line-height: 1.6;
  color: ${({ theme }) => theme.colors.text.secondary};
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
`

/** 빈 요약 자리 — 본문 위치에 놓인 '여기에 쓰세요' 한 줄(누르면 바로 입력칸) */
const SummaryPrompt = styled.button`
  align-self: flex-start;
  padding: 0;
  border: none;
  background: none;
  font: inherit;
  font-size: 13.5px;
  font-style: italic;
  color: ${metaText};
  cursor: text;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 2px;
    border-radius: 2px;
  }
`

const StepSummary = styled.div`
  font-size: 14px;
  line-height: 1.65;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const Phases = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: ${S.PROSE_WIDTH}px;
`

const PhaseGroup = styled.section`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

/** 구획 머리 — 상위 기간 기준 '시작 이전 · 기간 중 · 끝난 뒤'. 목록 행보다 작고 옅게 */
const PhaseHead = styled.h3`
  margin: 0;
  display: flex;
  align-items: baseline;
  gap: 6px;
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const PhaseCount = styled.span`
  font-size: 12px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  color: ${metaText};
`

/**
 * 묶음 사건의 '전체 글' 안내 — 배경·여파가 둘 다 비었을 때 개요 탭 머리에 한 줄.
 *
 * 묶음 사건은 전개를 하위 사건에 맡기므로, 이 사건 자신의 글은 '전체가 무엇이었고(개요) 왜
 * 일어나(배경) 어떻게 끝났나(여파)'뿐이다. 1차세계대전은 하위 18건을 거느리면서 이 셋이 모두 0자였다.
 */
export function CollectionWholeTextNotice({
  onWriteSummary,
  onWriteBackground,
  onWriteNarrative,
  onWriteAftermath,
}: {
  /** 요약도 비었으면 — 빈 요약 자리표시를 따로 세우지 않고 여기서 쓴다 */
  onWriteSummary?: () => void
  onWriteBackground: () => void
  /**
   * 단일 사건의 '아직 글이 없다' 안내로 쓸 때 — 단일 사건은 전개도 제 글이라 전개 쓰기가 붙는다.
   * (글이 하나도 없는 단일 사건 11건은 빈 요약 기울임 한 줄 + 칩 띠 + 그보다 큰 댓글 칸이 전부였다)
   */
  onWriteNarrative?: () => void
  onWriteAftermath: () => void
}) {
  const single = Boolean(onWriteNarrative)
  return (
    <Notice role="note">
      <NoticeText>
        {single ? (
          <>
            <b>아직 글이 없습니다.</b> 요약 한 문단으로 시작하거나, 배경·전개·여파로 나눠 씁니다.
          </>
        ) : (
          <>
            <b>전체에 대한 글이 비어 있습니다.</b> 전개는 하위 사건이 맡고, 이 사건에는{' '}
            {onWriteSummary ? '요약·배경·여파' : '배경·여파'}를 씁니다.
          </>
        )}
      </NoticeText>
      <NoticeActions>
        {onWriteSummary && (
          <TextButton type="button" onClick={onWriteSummary}>
            요약 쓰기
          </TextButton>
        )}
        <TextButton type="button" onClick={onWriteBackground}>
          배경 쓰기
        </TextButton>
        {onWriteNarrative && (
          <TextButton type="button" onClick={onWriteNarrative}>
            전개 쓰기
          </TextButton>
        )}
        <TextButton type="button" onClick={onWriteAftermath}>
          여파 쓰기
        </TextButton>
      </NoticeActions>
    </Notice>
  )
}

const Notice = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 6px 16px;
  max-width: ${S.PROSE_WIDTH}px;
  padding: 10px 14px;
  border-radius: ${RADIUS.SM};
  background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
`

const NoticeText = styled.p`
  flex: 1 1 320px;
  margin: 0;
  /* 한국어는 낱말 경계에서 줄을 바꾼다 — 안 그러면 '배 / 경'처럼 낱말이 잘린다 */
  word-break: keep-all;
  font-size: 13.5px;
  line-height: 1.6;
  color: ${({ theme }) => theme.colors.text.secondary};

  b {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const NoticeActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px 14px;
`
