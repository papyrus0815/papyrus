import { type DragEvent, type ReactNode, Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { FiLayers, FiLink2, FiPlus } from 'react-icons/fi'
import { Link, useNavigate } from 'react-router-dom'
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
import { type UpdateEventDto, deleteEvent, updateEvent } from '@/shared/api/events'
import { getEventOverview } from '@/shared/api/event-overview'
import { eventKeys } from '@/shared/api/event-query-keys'
import { invalidateEventQueries } from '@/shared/api/invalidate-events'
import { pathKeys } from '@/shared/router'
import { notify } from '@/shared/ui/toast'
import { shouldInterceptEntityClick } from '@/widgets/country/country-inline-modal'
import { EventInlineModal } from '@/widgets/event/event-inline-modal/event-inline-modal'

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
  /** 미리보기 모달로 연 하위 사건 — 전개에서 제목을 누르면 상세로 넘어가지 않고 그 자리에서 본다 */
  const [previewId, setPreviewId] = useState<string | null>(null)
  const navigate = useNavigate()
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
  /**
   * 끌기 사용법 안내 — 한 번 끌어 놓아 본 사람에겐 다시 보이지 않는다(브라우저에 기억, 실패해도 그냥 보인다).
   * 늘 서 있으면 목록 끝마다 두 줄이 자리를 먹는다.
   */
  const [dragHintSeen, setDragHintSeen] = useState(() => {
    try {
      return window.localStorage.getItem(DRAG_HINT_KEY) === '1'
    } catch {
      return false
    }
  })
  const markDragHintSeen = () => {
    if (dragHintSeen) return
    setDragHintSeen(true)
    try {
      window.localStorage.setItem(DRAG_HINT_KEY, '1')
    } catch {
      /* 저장 못 해도 이번 방문 동안은 숨긴다 */
    }
  }

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
  /**
   * 이 화면에서 바꾼 종류 — 조망 응답에 종류가 안 실려 오는 동안(옛 API 빌드) 하위의 하위는 '하위가 있나'로만
   * 판별돼, 하위 없는 사건을 묶음으로 바꿔도 개별로 남아 보였다. 바꾼 결과를 기억해 판별에 얹는다.
   * 응답에 종류가 실리면 그것이 정본이라(buildEventTree가 node.kind 우선) 이 기억은 자연히 뒤로 물러난다.
   */
  const [kindOverrides, setKindOverrides] = useState<ReadonlyMap<string, 'SINGLE' | 'COLLECTION'>>(() => new Map())
  const rememberKind = (id: string, kind: 'SINGLE' | 'COLLECTION') =>
    setKindOverrides((prev) => new Map(prev).set(id, kind))
  const kindById = useMemo(
    () =>
      new Map([
        ...(event.childEvents ?? []).map(
          (child) => [child.id, child.kind === 'COLLECTION' ? ('COLLECTION' as const) : ('SINGLE' as const)] as const,
        ),
        ...kindOverrides,
      ]),
    [event.childEvents, kindOverrides],
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
   * 구획의 기준 시점 — '시작 이전'은 무엇의 이전인지(상위 시작일)를 함께 말해야 구획이 읽힌다.
   * 상위 날짜를 모르면 라벨만.
   */
  const parentStart = event.startDate
    ? formatDateRange(event.startDate, undefined, event.startDatePrecision, undefined)
    : null
  const parentEnd = event.endDate ? formatDateRange(event.endDate, undefined, event.endDatePrecision, undefined) : null
  const phaseRange = (phase: string): string | null => {
    if (phase === 'before') return parentStart ? `${parentStart} 이전` : null
    if (phase === 'during') return parentStart ? `${parentStart} ~ ${parentEnd ?? ''}`.trim() : null
    if (phase === 'after') return parentEnd ? `${parentEnd} 이후` : null
    return '날짜를 모르는 사건'
  }

  const becomeSingle = () =>
    onPatch({ kind: 'SINGLE' } as UpdateEventDto, {
      savedLabel: `'${event.title}'을(를) 단일 사건으로 바꿈`,
    })

  /* ── 끌어다 놓기 ── */

  const titleOf = (id: string) => (id === event.id ? event.title : (index.get(id)?.title ?? '사건'))

  /** 끄는 동안 커서에 붙는 칩 — 기본 미리보기(행 전체 스냅샷)는 손자까지 딸려 와 커서를 덮었다 */
  const previewRef = useRef<HTMLDivElement>(null)
  /** 접힌 묶음 위에 잠시 머무르면 저절로 펼친다(스프링) — 접힌 묶음 속 깊은 자리에도 놓을 수 있게 */
  const springRef = useRef<{ id: string; timer: number } | null>(null)
  const clearSpring = () => {
    if (springRef.current) window.clearTimeout(springRef.current.timer)
    springRef.current = null
  }
  const sectionRef = useRef<HTMLElement>(null)

  const endDrag = () => {
    clearSpring()
    setDraggingId(null)
    setDropHint(null)
  }

  /**
   * 끄는 동안 목록 위·아래 끝 근처에 오면 지면을 스스로 굴린다 — 이 지면의 스크롤은 창이 아니라 내부 S.Page라
   * 브라우저 기본 자동 스크롤이 닿지 않았다(긴 전개의 아래 묶음으로 옮기려면 놓았다가 다시 잡아야 했다).
   */
  useEffect(() => {
    if (!draggingId) return undefined
    let scroller: HTMLElement | null = sectionRef.current?.parentElement ?? null
    while (scroller && !/(auto|scroll)/.test(getComputedStyle(scroller).overflowY)) scroller = scroller.parentElement
    if (!scroller) return undefined
    const edge = 72
    const onDragOver = (dragEvent: globalThis.DragEvent) => {
      const rect = scroller!.getBoundingClientRect()
      if (dragEvent.clientY < rect.top + edge) scroller!.scrollBy({ top: -18 })
      else if (dragEvent.clientY > rect.bottom - edge) scroller!.scrollBy({ top: 18 })
    }
    document.addEventListener('dragover', onDragOver)
    return () => document.removeEventListener('dragover', onDragOver)
  }, [draggingId])

  const actionAt = (targetId: string | 'root'): DropAction | null => {
    const dragged = draggingId ? index.get(draggingId) : undefined
    if (!dragged) return null
    const target = targetId === 'root' ? 'root' : index.get(targetId)
    if (!target || (target !== 'root' && (target as TreeRow).viaExtraLink)) return null
    return dropActionFor(dragged, target, event.id)
  }

  const refreshAround = (ids: Array<string | null | undefined>) => {
    for (const eventId of new Set([event.id, ...ids].filter(Boolean) as string[])) {
      invalidateEventQueries(queryClient, { eventId })
    }
  }

  /** 옮기기 — 끝나면 '되돌리기'가 달린 토스트(원래 상위로 다시 옮긴다) */
  const moveUnder = async (id: string, parentId: string, undo = false) => {
    const previousParent = index.get(id)?.parentEventId ?? event.id
    setBusy(true)
    try {
      await updateEvent(id, { parentEventId: parentId } as UpdateEventDto)
      if (undo) {
        notify.success(`'${titleOf(id)}'을(를) 제자리로 되돌렸습니다`)
      } else {
        notify.action(`'${titleOf(id)}'을(를) '${titleOf(parentId)}' 밑으로 옮겼습니다`, {
          label: '되돌리기',
          onClick: () => void moveUnder(id, previousParent, true),
        })
      }
    } catch (error) {
      notify.error(`옮기지 못했습니다 — ${crossPatchErrorMessage(error)}`)
    } finally {
      refreshAround([id, parentId, previousParent])
      setBusy(false)
    }
  }

  const dropOn = (targetId: string | 'root') => {
    const action = actionAt(targetId)
    const draggedId = draggingId
    endDrag()
    if (!action || !draggedId) return
    markDragHintSeen()
    if (action.type === 'move') {
      void moveUnder(draggedId, action.parentId)
    } else {
      /* 개별 위 — 둘을 묶을 새 묶음의 이름부터 받는다(놓인 사건 아래에 입력 줄) */
      setGroupPrompt({ draggedId, withId: action.withId, parentId: action.parentId })
    }
  }

  /** 끌어 묶기 — 끝나면 '되돌리기'(둘을 원래 상위로 돌려놓고 새 묶음은 지운다) */
  const submitGroup = async (name: string) => {
    if (!groupPrompt || !name.trim()) return
    const members = [groupPrompt.withId, groupPrompt.draggedId]
      .map((id) => index.get(id))
      .filter((node): node is TreeRow => Boolean(node))
    const previous = members.map((member) => ({ id: member.id, parentId: member.parentEventId ?? event.id }))
    setBusy(true)
    try {
      const created = await createCollectionWith({
        parentId: groupPrompt.parentId,
        title: name.trim(),
        members,
        domain: event.domain,
      })
      setGroupPrompt(null)
      notify.action(`${members.length}건을 새 묶음 '${created.title}'으로 묶었습니다`, {
        label: '되돌리기',
        onClick: () => void undoGroup(created.id, previous),
      })
    } catch (error) {
      notify.error(`묶지 못했습니다 — ${crossPatchErrorMessage(error)}`)
    } finally {
      refreshAround([groupPrompt.parentId, ...previous.map((item) => item.parentId), ...members.map((member) => member.id)])
      setBusy(false)
    }
  }

  const undoGroup = async (collectionId: string, previous: Array<{ id: string; parentId: string }>) => {
    setBusy(true)
    try {
      for (const item of previous) {
        await updateEvent(item.id, { parentEventId: item.parentId } as UpdateEventDto)
      }
      await deleteEvent(collectionId)
      notify.success('묶기를 되돌렸습니다')
    } catch (error) {
      notify.error(`되돌리지 못했습니다 — ${crossPatchErrorMessage(error)}`)
    } finally {
      refreshAround([collectionId, ...previous.flatMap((item) => [item.id, item.parentId])])
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
      /* 접힌 묶음 위에 머무르면 펼친다 */
      if (targetId !== 'root' && collapsedIds.has(targetId) && springRef.current?.id !== targetId) {
        clearSpring()
        springRef.current = {
          id: targetId,
          timer: window.setTimeout(() => {
            setCollapsedIds((prev) => {
              const next = new Set(prev)
              next.delete(targetId)
              return next
            })
            springRef.current = null
          }, 650),
        }
      }
    },
    onDragLeave: (dragEvent: DragEvent<HTMLElement>) => {
      /* 자식 요소로 들어간 것은 떠난 게 아니다 */
      if (dragEvent.currentTarget.contains(dragEvent.relatedTarget as Node | null)) return
      if (dropHint?.targetId === targetId) setDropHint(null)
      if (springRef.current?.id === targetId) clearSpring()
    },
    onDrop: (dragEvent: DragEvent<HTMLElement>) => {
      dragEvent.preventDefault()
      dragEvent.stopPropagation()
      dropOn(targetId)
    },
  })

  /** 끌기 손잡이 — 타임라인 노드와 날짜·제목 줄 둘 다(번호만 잡을 수 있던 때보다 잡을 자리가 넓다) */
  const dragSourceProps = (node: TreeRow) => ({
    draggable: true,
    onDragStart: (dragEvent: DragEvent<HTMLElement>) => {
      /* 손자 행의 시작이 부모 행까지 올라가 부모가 끌리지 않게 */
      dragEvent.stopPropagation()
      dragEvent.dataTransfer.effectAllowed = 'move'
      dragEvent.dataTransfer.setData('text/plain', node.id)
      if (previewRef.current) {
        previewRef.current.textContent = node.isCollection ? `▣ ${node.title} · 하위 ${node.children.length}` : node.title
        dragEvent.dataTransfer.setDragImage(previewRef.current, 14, 16)
      }
      setDraggingId(node.id)
      setGroupPrompt(null)
    },
    onDragEnd: endDrag,
  })

  const dropLabel = (action: DropAction) =>
    action.type === 'move'
      ? `'${titleOf(action.parentId)}' 밑으로 옮기기`
      : `'${titleOf(action.withId)}'와(과) 새 묶음으로 묶기`

  /* ── 한 행(재귀) — 타임라인의 한 마디 ── */

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
    const canDrag = owned && !selecting && !busy
    return (
      <Step
        key={node.id}
        $depth={node.depth}
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
        ) : (
          <NodeCol
            {...(canDrag ? dragSourceProps(node) : {})}
            data-grab={canDrag || undefined}
            title={canDrag ? '끌어서 다른 묶음 밑으로 옮기거나, 개별 사건 위에 놓아 함께 묶기' : undefined}
          >
            <Node $collection={node.isCollection} $depth={node.depth} aria-hidden>
              {ordinal}
            </Node>
          </NodeCol>
        )}
        <StepBody>
          <Grab {...(canDrag ? dragSourceProps(node) : {})} data-grab={canDrag || undefined}>
            {/* 날짜가 먼저 — 타임라인은 '언제'로 읽힌다(연혁·단락 타임라인과 같은 문법) */}
            <StepPeriod>
              <span>{dateLabel ?? '날짜 미상'}</span>
              {domain && (
                <DomainMeta>
                  <domain.Icon aria-hidden />
                  {domain.label}
                </DomainMeta>
              )}
              {node.viaExtraLink && <span>추가 상위로 연결</span>}
            </StepPeriod>
            <StepHead>
              <StepTitle
                to={pathKeys.events.detail(node.id)}
                viewTransition
                draggable={false}
                $nested={nested}
                aria-haspopup="dialog"
                onMouseEnter={() => prefetchEvent(node.id)}
                onFocus={() => prefetchEvent(node.id)}
                onClick={(clickEvent) => {
                  /* 보통 클릭 = 미리보기 모달. 새 탭(⌘/Ctrl·가운데 버튼)은 링크 그대로 */
                  if (!shouldInterceptEntityClick(clickEvent)) return
                  clickEvent.preventDefault()
                  setPreviewId(node.id)
                }}
              >
                {node.title}
              </StepTitle>
              {node.isCollection && (
                <ExpandToggle
                  expanded={!collapsed}
                  count={node.children.length}
                  title={node.title}
                  onToggle={() => setCollapsedIds((prev) => toggleIn(prev, node.id))}
                />
              )}
            </StepHead>
            {owned && !selecting && !draggingId && (
              <StepTools>
                <KindSwitch
                  parentId={node.parentEventId ?? event.id}
                  child={node}
                  onChanged={(kind) => rememberKind(node.id, kind)}
                />
              </StepTools>
            )}
          </Grab>
          {hint && <DropLabel role="status">{dropLabel(hint)}</DropLabel>}
          {groupPrompt?.withId === node.id && (
            <GroupPromptForm
              onSubmit={(submitEvent) => {
                submitEvent.preventDefault()
                const field = submitEvent.currentTarget.elements.namedItem('group-name') as HTMLInputElement | null
                void submitGroup(field?.value ?? '')
              }}
            >
              <GroupPromptText>'{titleOf(groupPrompt.draggedId)}'와(과) 함께 묶을 새 묶음 이름</GroupPromptText>
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
            <NestedSteps $depth={node.depth + 1}>
              {/* 하위 번호는 상위 번호를 잇는다 — 3의 하위는 3-1·3-2, 그 하위는 3-1-1(몇 번째 국면의 몇 번째인지) */}
              {node.children.map((child, childIndex) => renderRow(child, `${ordinal}-${childIndex + 1}`))}
              <NestedFooterItem $depth={node.depth + 1}>
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
    <S.Section id="narrative" aria-busy={busy} ref={sectionRef}>
      {/* 끌기 미리보기 칩 — 화면 밖에 두고 setDragImage로만 쓴다 */}
      <DragPreview ref={previewRef} aria-hidden />
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
            /* 화면 위에 붙어 있다(sticky) — 긴 전개의 아래에서 끌어도 꺼내는 자리가 늘 손 닿는 곳에 */
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
            <PhaseGroup
              key={group.phase}
              data-phase={group.phase}
              aria-label={showPhaseHeads ? PHASE_LABEL[group.phase] : undefined}
            >
              {showPhaseHeads && (
                <PhaseHead>
                  <PhaseMark aria-hidden />
                  <PhaseLabel>{PHASE_LABEL[group.phase]}</PhaseLabel>
                  {phaseRange(group.phase) && <PhaseRange>{phaseRange(group.phase)}</PhaseRange>}
                  <PhaseCount>{group.items.length}건</PhaseCount>
                </PhaseHead>
              )}
              <Steps data-phase={showPhaseHeads ? group.phase : undefined}>
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
          {!selecting && !dragHintSeen && allOwned.length > 1 && (
            <DragHint>
              날짜·제목 줄이나 번호를 끌어 묶음 위에 놓으면 그 밑으로, 개별 사건 위에 놓으면 둘을 새 묶음으로 묶습니다.
              접힌 묶음 위에 잠시 머무르면 펼쳐집니다.
            </DragHint>
          )}
        </Phases>
      )}

      <EventInlineModal
        eventId={previewId}
        onClose={() => setPreviewId(null)}
        onNavigate={(eventId) => {
          setPreviewId(null)
          navigate(pathKeys.events.detail(eventId))
        }}
      />

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

const DRAG_HINT_KEY = 'papyrus:event-development-drag-hint-seen'

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
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px 12px;
  max-width: ${S.PROSE_WIDTH}px;
  /* 구획 간격(22px)을 덜어 마지막 마디에 붙인다 — 떨어져 있으면 목록 밖의 별도 버튼으로 읽힌다 */
  margin-top: -14px;

  /* 타임라인의 다음 마디 — 위 세로선에서 점선으로 이어져 '+' 노드에 닿는다(아직 비어 있는 자리) */
  &::before {
    content: '';
    position: absolute;
    left: 13px;
    top: -10px;
    height: 30px;
    border-left: 2px dashed ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  }

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
  /* 위 마디들과 같은 노드 열(28px)·간격(12px) — '+' 노드가 세로선 위에 선다 */
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
  position: relative;
  z-index: 1;
  justify-self: center;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 2px dashed ${({ theme }) => ledgerAccent(theme.mode)};
  box-sizing: border-box;
  box-shadow: 0 0 0 4px ${({ theme }) => ledgerBackground(theme.mode)};
  background: ${({ theme }) => ledgerBackground(theme.mode)};
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
    border-style: solid;
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

/*
 * ───────────────────────── 타임라인 ─────────────────────────
 *
 * 연혁·단락 타임라인과 같은 문법: 왼쪽 세로선 하나에 사건마다 번호 노드가 꿰이고, 노드 옆에 **날짜 줄이 먼저**,
 * 그 아래 제목. 묶음은 노드가 둥근 사각(강조색 면)이라 '그 아래에 더 있다'를 모양으로 말하고, 그 하위는 본문
 * 열 안에서 한 단 작은 타임라인으로 이어진다. 예전엔 행 사이 머리카락선만 있는 목록이라 차례(시간)가 읽히지 않았다.
 */
const NODE = 24
const NESTED_NODE = 20
/**
 * 노드 열 폭 — 깊이마다 번호가 길어진다(3 → 3-1 → 3-1-2). 노드는 번호 길이만큼 늘어나는 알약이라,
 * 열을 그 길이에 맞춰 넓혀야 세로선(열 가운데)이 노드 가운데를 지난다.
 */
const columnOf = (depth: number) => (depth <= 1 ? 28 : depth === 2 ? 40 : 52)
const nodeSizeOf = (depth: number) => (depth <= 1 ? NODE : NESTED_NODE)
/** 세로선 x — 노드 가운데(선 2px) */
const lineLeft = (size: number) => size / 2 - 1

/** 한 단 타임라인 — 세로선은 첫 노드 가운데에서 시작해 마지막 행 끝까지 흐른다 */
const Steps = styled.ol`
  position: relative;
  display: flex;
  flex-direction: column;
  /* 요약 줄을 뺀 뒤 행이 날짜+제목 두 줄이라 간격도 한 단 좁힌다 */
  gap: 14px;
  max-width: ${S.PROSE_WIDTH}px;
  margin: 0;
  padding: 0;
  list-style: none;

  &::before {
    content: '';
    position: absolute;
    left: ${lineLeft(columnOf(1))}px;
    top: ${NODE / 2}px;
    bottom: 6px;
    width: 2px;
    border-radius: 1px;
    background: ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  }

  /* 상위 기간 밖 구획 — 선을 점선으로(기간 안이 아니라는 표지) */
  &[data-phase='before']::before,
  &[data-phase='after']::before,
  &[data-phase='undated']::before {
    width: 0;
    background: none;
    border-left: 2px dashed ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  }
`

const Step = styled.li<{ $depth: number }>`
  position: relative;
  display: grid;
  grid-template-columns: ${({ $depth }) => columnOf($depth)}px minmax(0, 1fr);
  column-gap: ${({ $depth }) => ($depth > 1 ? 10 : 12)}px;
  border-radius: ${RADIUS.SM};
  transition:
    background 0.12s,
    box-shadow 0.12s,
    opacity 0.12s;

  /* 고른 행 — 강조색 옅은 면(고르기 중에만 생긴다) */
  &[data-selected] {
    background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  }

  /* 끄는 중인 행 — 흐리게(어디서 왔는지는 남긴다) */
  &[data-dragging] {
    opacity: 0.35;
  }

  /*
   * 놓을 자리 — 묶음 밑으로(move)는 옅은 면 + 실선, 새 묶음(group)은 점선. 테두리는 inset 그림자·outline이라
   * 레이아웃이 밀리지 않는다. 노드도 함께 강조색으로 채워 '여기에 꿰인다'를 선 위에서 말한다.
   */
  &[data-drop='move'] {
    background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
    box-shadow: inset 0 0 0 2px ${({ theme }) => ledgerAccent(theme.mode)};
  }
  &[data-drop='group'] {
    outline: 2px dashed ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 2px;
  }
`

/** 노드 열 — 끌기 손잡이이기도 하다(커서 grab) */
const NodeCol = styled.div`
  display: flex;
  justify-content: center;
  align-items: flex-start;

  &[data-grab] {
    cursor: grab;
  }
  &[data-grab]:active {
    cursor: grabbing;
  }
`

/**
 * 노드 — 개별은 원, 묶음은 둥근 사각(강조색 테두리·옅은 면). 지면색 후광이 세로선을 끊어 노드가 선 위에 꿰인 것처럼.
 * 손이 닿으면(가장 안쪽 행만) 강조색으로 차서 '잡을 수 있다'를 말한다.
 */
const Node = styled.span<{ $collection: boolean; $depth: number }>`
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  /* 알약 — 한 자리 번호는 원, 3-1처럼 길어지면 옆으로 늘어난다 */
  min-width: ${({ $depth }) => nodeSizeOf($depth)}px;
  height: ${({ $depth }) => nodeSizeOf($depth)}px;
  padding: 0 ${({ $depth }) => ($depth > 1 ? 5 : 4)}px;
  white-space: nowrap;
  border-radius: ${({ $collection }) => ($collection ? '7px' : '999px')};
  border: 2px solid
    ${({ theme, $collection }) => ($collection ? ledgerAccent(theme.mode) : ledgerHairlineStrong(theme.mode))};
  background: ${({ theme, $collection }) =>
    $collection ? ledgerAccentSubtle(theme.mode) : ledgerBackground(theme.mode)};
  box-shadow: 0 0 0 4px ${({ theme }) => ledgerBackground(theme.mode)};
  font-size: ${({ $depth }) => ($depth > 1 ? 10.5 : 11.5)}px;
  letter-spacing: -0.02em;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  color: ${({ theme, $collection }) => ($collection ? ledgerAccent(theme.mode) : metaText)};
  user-select: none;
  transition:
    background 0.12s,
    color 0.12s,
    border-color 0.12s;

  li:hover:not(:has(li:hover)) > [data-grab] > &,
  li[data-drop='move'] > div > & {
    border-color: ${({ theme }) => ledgerAccent(theme.mode)};
    background: ${({ theme }) => ledgerAccent(theme.mode)};
    /* 채운 면의 전경은 지면색 — 다크 강조색은 밝은 인디고라 흰 글자가 묻힌다 */
    color: ${({ theme }) => ledgerBackground(theme.mode)};
  }
`

/** 고르기 칸 — 노드 자리 */
const StepCheck = styled.label`
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: center;
  padding-top: 3px;

  input {
    width: 16px;
    height: 16px;
    margin: 0;
    accent-color: ${({ theme }) => ledgerAccent(theme.mode)};
    cursor: pointer;
    box-shadow: 0 0 0 4px ${({ theme }) => ledgerBackground(theme.mode)};
  }
`

const StepBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  padding: 2px 0 4px;
`

/** 날짜·제목 줄 묶음 — 끌기 손잡이(노드보다 넓은 잡을 자리) */
const Grab = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 1px;

  &[data-grab] {
    cursor: grab;
  }
  &[data-grab]:active {
    cursor: grabbing;
  }
`

/** 날짜 줄 — 노드와 같은 높이에서 시작(연혁 날짜 줄과 같은 크기·굵기) */
const StepPeriod = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 2px 10px;
  min-height: 20px;
  font-size: 12.5px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.secondary};
`

/** 제목 + 하위 펼침 — 좁으면 펼침 단추가 다음 줄로 */
const StepHead = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 2px 10px;
`

/** 분야 — 아이콘 + 이름. 예전 글자 글리프(⚔·✚)는 12px에서 '✕'·'+'로 읽혀 지우기·추가 버튼처럼 보였다 */
const DomainMeta = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-weight: 500;
  color: ${metaText};

  svg {
    width: 11px;
    height: 11px;
  }
`

const StepTitle = styled(Link)<{ $nested?: boolean }>`
  font-size: ${({ $nested }) => ($nested ? 14 : 15.5)}px;
  font-weight: 700;
  line-height: 1.45;
  letter-spacing: -0.01em;
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




/**
 * 행 도구(개별|묶음) — 날짜 줄 오른쪽 끝에 겹쳐 뜬다. 가장 안쪽 행에 손이 닿을 때만(손자에 닿으면 부모도
 * :hover라 겹겹이 떴다). 흐름 밖이라 숨어 있어도 줄을 만들지 않는다.
 */
const StepTools = styled.span`
  position: absolute;
  top: -2px;
  right: 0;
  z-index: 2;
  padding-left: 8px;
  background: ${({ theme }) => ledgerBackground(theme.mode)};
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.14s;

  li:hover:not(:has(li:hover)) > div > div > &,
  div:focus-within > & {
    opacity: 1;
    pointer-events: auto;
  }

  /* 손이 닿는 순간이 없는 터치 환경 — 상시 보이되 흐름 안으로(겹쳐 두면 글자를 가린다) */
  @media (hover: none) {
    position: static;
    align-self: flex-start;
    padding-left: 0;
    background: none;
    opacity: 1;
    pointer-events: auto;
  }
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

/** 묶음의 하위 — 본문 열 안에서 한 단 작은 타임라인 */
const NestedSteps = styled.ol<{ $depth: number }>`
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 10px 0 2px;
  padding: 0;
  list-style: none;

  &::before {
    content: '';
    position: absolute;
    left: ${({ $depth }) => lineLeft(columnOf($depth))}px;
    top: ${NESTED_NODE / 2}px;
    bottom: 10px;
    width: 2px;
    border-radius: 1px;
    background: ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  }
`

/** 묶음 끝 줄 — 하위 타임라인의 마지막 마디(노드 열만큼 들여서 제목 열에 맞춘다) */
const NestedFooterItem = styled.li<{ $depth: number }>`
  padding: 0 0 0 ${({ $depth }) => columnOf($depth) + 10}px;
`

/** 끄는 동안 지면 위쪽에 붙는 띠 — 여기 놓으면 이 사건 바로 밑(묶음에서 꺼내기) */
const RootDrop = styled.div`
  position: sticky;
  top: 64px;
  z-index: 6;
  max-width: ${S.PROSE_WIDTH}px;
  padding: 12px 14px;
  border-radius: ${RADIUS.MD};
  border: 2px dashed ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: ${({ theme }) => ledgerBackground(theme.mode)};
  box-shadow: ${({ theme }) =>
    theme.mode === 'dark' ? '0 6px 18px rgba(0, 0, 0, 0.45)' : '0 6px 18px rgba(15, 23, 42, 0.08)'};
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  text-align: center;
  transition:
    background 0.12s,
    border-color 0.12s,
    color 0.12s;

  &[data-active] {
    border-color: ${({ theme }) => ledgerAccent(theme.mode)};
    background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
    color: ${({ theme }) => ledgerAccent(theme.mode)};
  }
  &[data-disabled] {
    opacity: 0.6;
  }
`

/** 끌기 미리보기 칩 — 화면 밖에 두고 setDragImage로만 쓴다(커서 옆에 제목 한 줄) */
const DragPreview = styled.div`
  position: fixed;
  top: -200px;
  left: -2000px;
  max-width: 320px;
  padding: 6px 12px;
  border-radius: ${RADIUS.PILL};
  background: ${({ theme }) => ledgerAccent(theme.mode)};
  color: ${({ theme }) => ledgerBackground(theme.mode)};
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  pointer-events: none;
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
  line-height: 1.6;
  color: ${metaText};
  word-break: keep-all;
`

const Phases = styled.div`
  display: flex;
  flex-direction: column;
  gap: 28px;
  max-width: ${S.PROSE_WIDTH}px;
`

/**
 * 구획 — 상위 기간에 비춘 '시작 이전 · 기간 중 · 끝난 뒤 · 날짜 미상'. 구획마다 머리 줄(표지 + 이름 + 기준 시점 +
 * 건수)과 위 경계선으로 갈라, 타임라인이 구획마다 끊겼다 다시 시작한다. **기간 밖(이전·이후) 구획은 세로선을
 * 점선으로** — 상위 사건의 기간 바깥이라는 것을 선 모양이 말한다(예전엔 작은 라벨 하나라 구획이 안 갈렸다).
 */
/**
 * 구획 — 상위 기간에 비춘 '시작 이전 · 기간 중 · 끝난 뒤 · 날짜 미상'. 구획마다 **면이 있는 머리 띠**로 갈라
 * (기간 중 = 강조색 옅은 면, 기간 밖 = 점선 테두리), 스크롤하는 동안 탭 아래에 붙어 지금 어느 구획을 읽는지
 * 늘 보인다. 기간 밖 구획은 세로선도 점선이다. 예전엔 작은 라벨 + 머리카락선뿐이라 구획이 안 갈렸다.
 */
const PhaseGroup = styled.section`
  display: flex;
  flex-direction: column;
  gap: 16px;

  & + & {
    margin-top: 14px;
  }
`

const PhaseHead = styled.h3`
  position: sticky;
  /* 탭 줄(sticky top 0) 바로 아래 */
  top: 48px;
  z-index: 3;
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 10px;
  padding: 10px 14px 10px 0;
  border-radius: 10px;
  border: 1px dashed ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  /* 띠 아래로 지나가는 행 글자가 비치지 않게 불투명 — 지면색 위에 옅은 색을 한 겹 */
  background: ${({ theme }) =>
    `linear-gradient(${theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.035)'}, ${
      theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.035)'
    }), ${ledgerBackground(theme.mode)}`};

  [data-phase='during'] > & {
    border: 1px solid ${({ theme }) => ledgerAccent(theme.mode)};
    background: ${({ theme }) =>
      `linear-gradient(${ledgerAccentSubtle(theme.mode)}, ${ledgerAccentSubtle(theme.mode)}), ${ledgerBackground(theme.mode)}`};
  }
`

/** 구획 표지 — 노드 열 자리(세로선 위). 기간 중은 강조색으로 찬 사각, 기간 밖은 테두리만, 날짜 미상은 회색 */
const PhaseMark = styled.span`
  display: inline-block;
  flex-shrink: 0;
  width: 12px;
  height: 12px;
  margin: 0 0 0 ${(28 - 12) / 2}px;
  border-radius: 3px;
  border: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
  background: transparent;

  [data-phase='during'] > h3 > & {
    background: ${({ theme }) => ledgerAccent(theme.mode)};
  }
  [data-phase='undated'] > h3 > & {
    border-color: ${({ theme }) => theme.colors.text.tertiary};
  }
`

const PhaseLabel = styled.span`
  margin-left: 6px;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.colors.text.primary};

  [data-phase='during'] > h3 > & {
    color: ${({ theme }) => ledgerAccent(theme.mode)};
  }
`

/** 기준 시점 — '1914년 7월 28일 이전' */
const PhaseRange = styled.span`
  font-size: 12.5px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const PhaseCount = styled.span`
  margin-left: auto;
  padding: 1px 8px;
  border-radius: ${RADIUS.PILL};
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  font-size: 11.5px;
  font-weight: 600;
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
