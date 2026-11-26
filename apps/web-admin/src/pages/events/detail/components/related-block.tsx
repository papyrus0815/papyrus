import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FiArrowRight, FiChevronDown, FiChevronUp, FiEdit2, FiPlus, FiX } from 'react-icons/fi'
import { Link } from 'react-router-dom'
import styled from 'styled-components'

import {
  ledgerAccent,
  ledgerAccentSubtle,
  ledgerHairline,
  ledgerHairlineStrong,
} from '@/entities/event/ui/ledger-tokens'
import { eventDomainDef } from '@/entities/event/model/event-domain'
import { metaText } from '@/pages/events/styles/theme'
import { formatDateRange } from '@/pages/events/utils/events.utils'
import {
  DIRECTED_RELATION_TYPES,
  EVENT_RELATION_LABELS,
  type EventRelationCounterpart,
  type EventRelationDirection,
  type EventRelationItem,
  createEventRelation,
  deleteEventRelation,
  updateEventRelation,
} from '@/shared/api/event-relations'
import { eventKeys } from '@/shared/api/event-query-keys'
import { getEventLinkCandidates } from '@/shared/api/events'
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value'
import { formatYearLabel } from '@/shared/lib/iso-date'
import { pathKeys } from '@/shared/router'
import { confirm } from '@/shared/ui/confirm-dialog'
import { InlineText } from '@/shared/ui/inline-edit'
import { notify } from '@/shared/ui/toast'

import { usePrefetchEventDetail } from '../use-event-detail'
import { eventRelationKeys, useEventRelations } from '../use-event-relations'
import { REASON_MAX, compareEventStart } from './detail-network.lib'
import { type LinkCandidate, type RelatedLinkFilter, type RelationDraft, RelatedLinkModal } from './related-link-modal'
import { type PickerEvent, byProximity, directionConflicts, particle, signedStartYear } from './related-picker.lib'
import { type RelatedSuggestion } from './related-suggestions.lib'
import * as NetStyles from './detail-network.styles'

/**
 * 관련 사건 블록 — 상위/하위(계보 소속)로는 묶을 수 없는 **별개 사건끼리의 연결**.
 * 예: '아바르 칸국 건국' —계기가 됨→ '롬바르드 왕국 건국'.
 *
 * 한 관계는 양쪽 사건에 모두 보이고, 방향이 있는 유형은 이 사건 쪽 문구로 읽힌다
 * (롬바르드 쪽에선 '계기가 된 사건: 아바르 칸국 건국', 아바르 쪽에선 '이 사건으로 일어난 사건').
 * 묶음 순서는 앞 사건(원인 쪽) → 뒤 사건(결과 쪽) → 무방향.
 *
 * 추가 흐름: 잇기 창(related-link-modal) 하나에서 사건 고르기 → 유형·방향·이유 → 연결(또는 연결하고 계속).
 * 이미 연결된 사건을 고르면 새로 만들지 않고 그 관계의 수정으로 들어간다(한 쌍 한 행).
 */

interface RelatedBlockProps {
  eventId: string
  eventTitle: string
  /** 이 사건의 시작 — 모달 기본 후보(같은 시기)·상대 시점·방향 추정의 기준 */
  self?: PickerEvent & { parentEventId?: string | null }
  /** 상위·하위로 이미 이어진 사건 — 모달 후보에서 뺀다 */
  hierarchyIds?: ReadonlySet<string>
  /** 같은 키워드의 사건 — 누르면 그 사건이 채워진 작성 줄이 열린다 */
  suggestions?: RelatedSuggestion[]
  /** 현재 사건을 '계기가 된 사건'으로 미리 담아 새 관련 사건 등록 모달 열기 */
  onOpenCreateRelated?: () => void
  /** 연결 지도와 함께 가리키는 사건 — 지도 마디에 올리면 이 줄이, 이 줄에 올리면 지도 마디가 진해진다 */
  hotEventId?: string | null
  onHoverEvent?: (id: string | null) => void
  /** 묶음 — 지도에 그린 아래 사건끼리의 연결 수. 자기 관계가 0이면 '위 지도에서'를 한 줄 알린다 */
  descendantRelationCount?: number
  /** 상위 구역 헤더의 '관련 사건 잇기' 클릭 신호 (증가할 때마다 잇기 모달 열기) */
  openPickerSeq?: number
  /** 빈 탭 화면에서 모달만 마운트할 때 — 보드 UI 없이 잇기 모달만 렌더링한다 */
  modalOnly?: boolean
}

type Draft = RelationDraft

/** 묶음의 자리 — 이 사건보다 앞선 원인 쪽 · 뒤따른 결과 쪽 · 곁 */
type GroupSide = 'before' | 'after' | 'beside'
const SIDE_GLYPH: Record<GroupSide, string> = { before: '←', after: '→', beside: '↔' }
const SIDE_LABEL: Record<GroupSide, string> = {
  before: '이 사건의 원인 쪽',
  after: '이 사건이 낳은 결과 쪽',
  beside: '곁에서 얽힌 사건',
}
const SIDE_HINT: Record<GroupSide, string> = {
  before: '이 사건을 일으켰거나 배경이 된 사건, 이 사건이 맞선 사건',
  after: '이 사건이 일으켰거나 배경이 된 사건, 이 사건에 맞서 일어난 사건',
  beside: '원인·결과라기보다 같은 때 얽혔거나 그 밖에 이어진 사건',
}
const SIDE_ORDER: GroupSide[] = ['before', 'after', 'beside']

/**
 * 긴 목록 접기 — 관련 사건이 이보다 많으면 종류 묶음마다 앞의 몇 건만 보이고 나머지는 '더 보기'.
 * NSPM-2(관계 5)·연맹제(8)에서 이유 글까지 펼친 목록이 지도 아래 1,000px를 넘겼다.
 */
const LONG_LIST = 6
const GROUP_PREVIEW = 4

/** 같은 시기 후보의 창 — 앞뒤 30년(서버 기본), 가까운 순 */
const NEAR_WINDOW_YEARS = 30

/** 날짜 필드만 — 후보·관계 상대에서 작성 줄로 옮겨 담는다 */
const startFieldsOf = (
  node: PickerEvent,
): Pick<PickerEvent, 'startDate' | 'startDatePrecision' | 'startEra' | 'startYear'> => ({
  startDate: node.startDate ?? null,
  startDatePrecision: node.startDatePrecision ?? null,
  startEra: node.startEra ?? null,
  startYear: node.startYear ?? null,
})

/** 상대 사건 날짜 — 정밀도를 지켜(연도만 아는 사건에 1월 1일을 붙이지 않게), BC는 구조화 연도로 */
function counterpartDateLabel(event: EventRelationCounterpart): string | null {
  if (event.startDate) {
    return formatDateRange(event.startDate, undefined, event.startDatePrecision ?? undefined)
  }
  if (event.startYear != null) {
    return formatYearLabel(event.startEra === 'BC' ? -event.startYear : event.startYear)
  }
  return null
}

function candidateDateLabel(candidate: PickerEvent): string | null {
  if (candidate.startDate) {
    return formatDateRange(candidate.startDate, undefined, candidate.startDatePrecision)
  }
  if (candidate.startYear != null) {
    return formatYearLabel(
      candidate.startEra === 'BC' ? -candidate.startYear : candidate.startYear,
    )
  }
  return null
}

function errorMessage(error: unknown, fallback: string) {
  const text = error instanceof Error ? error.message : String(error ?? '')
  if (text.includes('409')) return '이미 연결된 사건입니다 — 기존 관계를 수정하세요'
  if (text.includes('403')) return '본인이 등록한 사건만 연결할 수 있습니다'
  return fallback
}

export function RelatedBlock({
  eventId,
  eventTitle,
  self = {},
  hierarchyIds,
  suggestions = [],
  onOpenCreateRelated,
  hotEventId = null,
  onHoverEvent,
  descendantRelationCount = 0,
  openPickerSeq = 0,
  modalOnly = false,
}: RelatedBlockProps) {
  const queryClient = useQueryClient()
  const prefetchEvent = usePrefetchEventDetail()
  const { data: relations = [], isError } = useEventRelations(eventId)

  /* 잇기 창 — 고르기와 정하기를 한 창에서(예전엔 고르면 창이 닫히고 작성 줄이 본문 아래에 따로 열렸다) */
  const [pickerOpen, setPickerOpen] = useState(false)
  const [initialDraft, setInitialDraft] = useState<Draft | null>(null)
  const [descriptionDraftId, setDescriptionDraftId] = useState<string | null>(null)
  /** 잇기 창을 열 때의 거르기 */
  const [pickerFilter, setPickerFilter] = useState<RelatedLinkFilter>('all')
  const [preferredDirection, setPreferredDirection] = useState<EventRelationDirection | null>(null)
  /** 긴 목록에서 펼친 묶음 */
  const [expandedGroups, setExpandedGroups] = useState<ReadonlySet<string>>(() => new Set())
  const [expandedCausalBefore, setExpandedCausalBefore] = useState(false)
  const [expandedCausalAfter, setExpandedCausalAfter] = useState(false)

  useEffect(() => {
    if (openPickerSeq <= 0) return
    setInitialDraft(null)
    setPickerFilter('all')
    setPreferredDirection(null)
    setPickerOpen(true)
  }, [openPickerSeq])

  const openPickerForDirection = (direction: EventRelationDirection | null) => {
    setInitialDraft(null)
    setPickerFilter('all')
    setPreferredDirection(direction)
    setPickerOpen(true)
  }

  // ── 후보 검색(서버) — 상위/하위 픽커와 같은 link-candidates 엔드포인트 ──
  const [searchTerm, setSearchTerm] = useState('')
  const debouncedTerm = useDebouncedValue(searchTerm, 250, String(pickerOpen))
  /*
   * 검색어가 비면 **이 사건 근처** 사건을 가까운 순으로 — 예전엔 최근 수정순이라 사라예보(1914)에서
   * 1789년 프랑스 혁명 사건 50건이 섰다. 검색 중엔 시기로 거르지 않는다(멀리 있는 원인도 찾게).
   */
  const selfYear = signedStartYear(self)
  const browsing = debouncedTerm.trim() === ''
  const nearYear = browsing ? selfYear : null
  const candidatesQuery = useQuery({
    queryKey: eventKeys.linkCandidates(debouncedTerm, 'related', nearYear),
    queryFn: () =>
      getEventLinkCandidates({
        query: debouncedTerm,
        limit: 51,
        ...(nearYear != null ? { near: nearYear, window: NEAR_WINDOW_YEARS } : {}),
      }),
    enabled: pickerOpen,
    staleTime: 60_000,
    placeholderData: keepPreviousData,
    retry: 1,
  })
  const relatedIds = useMemo(
    () => new Map(relations.map((relation) => [relation.event.id, relation])),
    [relations],
  )

  /* 창이 열려 있을 때만 — 많아야 55줄. 같은 키워드(둘러볼 때만) + 서버 후보(가까운 순) */
  const buildCandidates = (): LinkCandidate[] => {
    const excluded = (id: string) => id === eventId || Boolean(hierarchyIds?.has(id))
    const existingOf = (id: string) => {
      const relation = relatedIds.get(id)
      return relation
        ? {
            relationId: relation.id,
            relationType: relation.relationType,
            direction: relation.direction,
            description: relation.description ?? null,
          }
        : undefined
    }
    const keywordRows: LinkCandidate[] = browsing
      ? suggestions
          .filter((suggestion) => !excluded(suggestion.id))
          .map((suggestion) => ({
            ...startFieldsOf(suggestion),
            id: suggestion.id,
            title: suggestion.title,
            dateLabel: candidateDateLabel(suggestion),
            membership: null,
            sameParent: false,
            sharedKeywords: suggestion.shared,
            existing: existingOf(suggestion.id),
          }))
      : []
    const keywordIds = new Set(keywordRows.map((row) => row.id))
    const serverRows: LinkCandidate[] = byProximity(
      self,
      (candidatesQuery.data ?? []).filter((candidate) => !excluded(candidate.id) && !keywordIds.has(candidate.id)),
    )
      .slice(0, 50)
      .map((candidate) => {
        const sameParent = Boolean(candidate.parentEventId) && candidate.parentEventId === self.parentEventId
        return {
          ...startFieldsOf(candidate),
          id: candidate.id,
          title: candidate.title,
          subtitle: candidate.subtitle ?? null,
          dateLabel: candidateDateLabel(candidate),
          membership: sameParent
            ? '같은 상위의 사건'
            : candidate.parentEventTitle
              ? `‘${candidate.parentEventTitle}’의 하위`
              : null,
          sameParent,
          existing: existingOf(candidate.id),
        }
      })
    return byProximity(self, [...keywordRows, ...serverRows])
  }
  const linkCandidates = pickerOpen ? buildCandidates() : []

  /* 관계는 조망(하위끼리 연결)·연결 그래프(마인드맵)에도 실린다 — 둘 다 ['events', …] 아래 */
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: eventRelationKeys.all })
    void queryClient.invalidateQueries({ queryKey: ['events', 'overview'] })
    void queryClient.invalidateQueries({ queryKey: ['events', 'relation-graph'] })
  }

  const saveMutation = useMutation({
    mutationFn: async (next: Draft) => {
      const description = next.description.trim() || null
      const direction = DIRECTED_RELATION_TYPES.has(next.relationType)
        ? next.direction
        : undefined
      if (next.relationId) {
        return updateEventRelation(eventId, next.relationId, {
          relationType: next.relationType,
          direction,
          description,
        })
      }
      return createEventRelation(eventId, {
        relatedEventId: next.other.id,
        relationType: next.relationType,
        direction,
        description,
      })
    },
    onSuccess: (_saved, next) => {
      notify.success(
        next.relationId
          ? '관계를 수정했습니다'
          : `‘${next.other.title}’${particle(next.other.title, '과/와')} 연결했습니다`,
      )
      void invalidate()
    },
    onError: (error) => notify.error(errorMessage(error, '관계를 저장하지 못했습니다')),
  })

  const descriptionMutation = useMutation({
    mutationFn: ({ relationId, description }: { relationId: string; description: string }) =>
      updateEventRelation(eventId, relationId, { description: description.trim() || null }),
    onSuccess: () => void invalidate(),
    onError: () => notify.error('설명을 저장하지 못했습니다'),
  })

  const removeMutation = useMutation({
    mutationFn: (relationId: string) => deleteEventRelation(eventId, relationId),
    onSuccess: () => {
      notify.success('연결을 해제했습니다')
      void invalidate()
    },
    onError: () => notify.error('연결을 해제하지 못했습니다'),
  })

  const [draggingRelationId, setDraggingRelationId] = useState<string | null>(null)
  const [dragOverSide, setDragOverSide] = useState<GroupSide | null>(null)

  const sideOfRelation = (relation: EventRelationItem): GroupSide =>
    !DIRECTED_RELATION_TYPES.has(relation.relationType)
      ? 'beside'
      : relation.direction === 'incoming'
        ? 'before'
        : 'after'

  const roleSwitchMutation = useMutation({
    mutationFn: async ({
      relation,
      targetSide,
    }: {
      relation: EventRelationItem
      targetSide: GroupSide
    }) => {
      if (targetSide === 'beside') {
        return updateEventRelation(eventId, relation.id, {
          relationType: 'CONCURRENT',
        })
      }
      const nextType = DIRECTED_RELATION_TYPES.has(relation.relationType)
        ? relation.relationType
        : 'LED_TO'
      const nextDirection: EventRelationDirection =
        targetSide === 'before' ? 'incoming' : 'outgoing'
      return updateEventRelation(eventId, relation.id, {
        relationType: nextType,
        direction: nextDirection,
      })
    },
    onSuccess: (_saved, variables) => {
      notify.success(
        `‘${variables.relation.event.title}’을(를) ‘${SIDE_LABEL[variables.targetSide]}’(으)로 옮겼습니다`,
      )
      void invalidate()
    },
    onError: () => notify.error('관계 방향을 바꾸지 못했습니다'),
  })

  const handleDropToSide = (
    dragEvent: React.DragEvent<HTMLElement>,
    targetSide: GroupSide,
  ) => {
    dragEvent.preventDefault()
    const rawId =
      draggingRelationId ||
      (dragEvent.dataTransfer?.getData('text/plain') ?? '').replace(
        /^relation:/,
        '',
      )
    setDraggingRelationId(null)
    setDragOverSide(null)
    if (!rawId) return
    const matched = relations.find((item) => item.id === rawId)
    if (!matched) return
    if (sideOfRelation(matched) === targetSide) return
    roleSwitchMutation.mutate({ relation: matched, targetSide })
  }

  const openEdit = (relation: EventRelationItem) => {
    setInitialDraft({
      relationId: relation.id,
      other: {
        id: relation.event.id,
        title: relation.event.title,
        dateLabel: counterpartDateLabel(relation.event),
        ...startFieldsOf(relation.event),
      },
      relationType: relation.relationType,
      direction: relation.direction,
      description: relation.description ?? '',
    })
    setPickerOpen(true)
  }

  const closePicker = () => {
    setPickerOpen(false)
    setSearchTerm('')
    setInitialDraft(null)
    setPickerFilter('all')
    setPreferredDirection(null)
  }

  const handleRemove = async (relation: EventRelationItem) => {
    const ok = await confirm({
      title: '관련 사건 연결 해제',
      message: `‘${relation.event.title}’${particle(relation.event.title, '과/와')}의 연결을 해제할까요? 두 사건 모두에서 사라집니다.`,
      confirmLabel: '해제',
    })
    if (ok) removeMutation.mutate(relation.id)
  }

  /*
   * 묶음 — 원인 쪽 · 결과 쪽 · 곁 세 칸만. 관계 종류(직접 계기·배경·대응)는 행의 꼬리표로.
   * 예전엔 종류×방향 8칸이라 지롱드파(관계 7)가 4묶음, 그중 2묶음이 1건짜리 — 머리가 행만큼 자리를 먹었다.
   * 칸 안은 날짜순(원인 쪽은 앞선 일부터 읽힌다).
   */
  const groups = useMemo(() => {
    return SIDE_ORDER.flatMap((side) => {
      const items = relations
        .filter((relation) => sideOfRelation(relation) === side)
        .sort((left, right) => compareEventStart(left.event.startDate, right.event.startDate))
      return items.length > 0 ? [{ key: side, label: SIDE_LABEL[side], hint: SIDE_HINT[side], side, items }] : []
    })
  }, [relations])

  const beforeItems = useMemo(
    () =>
      relations
        .filter((relation) => sideOfRelation(relation) === 'before')
        .sort((left, right) =>
          compareEventStart(left.event.startDate, right.event.startDate),
        ),
    [relations],
  )
  const afterItems = useMemo(
    () =>
      relations
        .filter((relation) => sideOfRelation(relation) === 'after')
        .sort((left, right) =>
          compareEventStart(left.event.startDate, right.event.startDate),
        ),
    [relations],
  )
  const besideItems = useMemo(
    () =>
      relations
        .filter((relation) => sideOfRelation(relation) === 'beside')
        .sort((left, right) =>
          compareEventStart(left.event.startDate, right.event.startDate),
        ),
    [relations],
  )
  const selfDateText = candidateDateLabel(self)
  const hasDetailNotesOrWarnings = useMemo(
    () =>
      relations.some(
        (relation) =>
          Boolean(relation.description?.trim()) ||
          directionConflicts(relation.relationType, relation.direction, self, startFieldsOf(relation.event)),
      ),
    [relations, self],
  )
  const [detailListToggled, setDetailListToggled] = useState<boolean | null>(null)
  const showDetailList = detailListToggled ?? hasDetailNotesOrWarnings

  const renderCausalPill = (relation: EventRelationItem, dragHint: string) => (
    <CausalFlowPill
      key={relation.id}
      draggable
      title={dragHint}
      onMouseEnter={() => {
        prefetchEvent(relation.event.id)
        onHoverEvent?.(relation.event.id)
      }}
      onMouseLeave={() => onHoverEvent?.(null)}
      onDragStart={(dragEvent) => {
        setDraggingRelationId(relation.id)
        dragEvent.dataTransfer?.setData('text/plain', `relation:${relation.id}`)
      }}
      onDragEnd={() => {
        setDraggingRelationId(null)
        setDragOverSide(null)
      }}
    >
      <CausalFlowPillLink
        to={pathKeys.events.detail(relation.event.id)}
        viewTransition
        title={`${relation.event.title} (${EVENT_RELATION_LABELS[relation.relationType] ?? relation.relationType})`}
      >
        {relation.event.title}
      </CausalFlowPillLink>
      <CausalFlowPillEdit
        type="button"
        onClick={(clickEvent) => {
          clickEvent.stopPropagation()
          openEdit(relation)
        }}
        aria-label={`'${relation.event.title}' 관계 수정`}
        title="관계·설명 수정"
      >
        <FiEdit2 size={11} />
      </CausalFlowPillEdit>
      <CausalFlowPillRemove
        type="button"
        onClick={(clickEvent) => {
          clickEvent.stopPropagation()
          void handleRemove(relation)
        }}
        aria-label={`'${relation.event.title}' 연결 해제`}
        title="연결 해제"
      >
        ×
      </CausalFlowPillRemove>
    </CausalFlowPill>
  )

  const relatedModal = (
    <RelatedLinkModal
      isOpen={pickerOpen}
      onClose={closePicker}
      eventTitle={eventTitle}
      self={self}
      candidates={linkCandidates}
      searching={!browsing}
      loading={candidatesQuery.isLoading}
      failed={candidatesQuery.isError}
      onRetry={() => void candidatesQuery.refetch()}
      onQueryChange={setSearchTerm}
      initialDraft={initialDraft}
      initialFilter={pickerFilter}
      preferredDirection={preferredDirection}
      saving={saveMutation.isPending}
      onSave={async (next) => {
        const saved = await saveMutation.mutateAsync(next)
        return (saved as { id?: string } | undefined)?.id
      }}
      onDelete={async (relationId) => {
        await removeMutation.mutateAsync(relationId)
      }}
      onCreateNew={
        onOpenCreateRelated
          ? () => {
              closePicker()
              onOpenCreateRelated()
            }
          : undefined
      }
    />
  )

  if (modalOnly) {
    return relatedModal
  }

  return (
    <NetStyles.HierBlock
      role="group"
      aria-labelledby="network-related-label"
    >

      {isError && <NetStyles.HelperNote>관련 사건을 불러오지 못했습니다</NetStyles.HelperNote>}
      {relations.length === 0 && !isError && descendantRelationCount > 0 && (
        <NetStyles.HelperNote>
          이 사건 자체에 이은 관련 사건은 없습니다 — 아래 사건끼리의 연결 {descendantRelationCount}개는 위 지도에서 보고 고칩니다.
        </NetStyles.HelperNote>
      )}

      {!isError && (
        <CausalFlowBoard $hasRelations={relations.length > 0} role="region" aria-label="인과 흐름 보드">
          <CausalFlowMainGrid>
            <CausalFlowNode
              data-causal-dropzone="before"
              $dragOver={dragOverSide === 'before'}
              onDragOver={(dragEvent) => {
                dragEvent.preventDefault()
                if (dragOverSide !== 'before') setDragOverSide('before')
              }}
              onDragLeave={(dragEvent) => {
                if (
                  !dragEvent.currentTarget.contains(
                    dragEvent.relatedTarget as Node | null,
                  )
                ) {
                  setDragOverSide((current) =>
                    current === 'before' ? null : current,
                  )
                }
              }}
              onDrop={(dragEvent) => handleDropToSide(dragEvent, 'before')}
            >
              <CausalFlowHead>
                <span>이전 · 원인 사건</span>
                {beforeItems.length > 0 && <CausalFlowCount>{beforeItems.length}</CausalFlowCount>}
              </CausalFlowHead>
              {beforeItems.length === 0 ? (
                <CausalFlowEmptySlot>
                  <CausalFlowEmpty>이 사건을 일으켰거나 배경·도화선이 된 앞선 사건</CausalFlowEmpty>
                  <CausalQuickAddBtn
                    type="button"
                    onClick={() => openPickerForDirection('incoming')}
                  >
                    <FiPlus size={12} aria-hidden />
                    원인 사건 연결
                  </CausalQuickAddBtn>
                </CausalFlowEmptySlot>
              ) : (
                <CausalFlowPillList>
                  {(expandedCausalBefore ? beforeItems : beforeItems.slice(0, 3)).map((relation) =>
                    renderCausalPill(relation, '드래그하여 결과·동시대로 이동'),
                  )}
                  {beforeItems.length > 3 && (
                    <CausalFlowMoreBtn
                      type="button"
                      onClick={() => setExpandedCausalBefore((previous) => !previous)}
                    >
                      {expandedCausalBefore ? '접기' : `+${beforeItems.length - 3} 더 보기`}
                    </CausalFlowMoreBtn>
                  )}
                </CausalFlowPillList>
              )}
            </CausalFlowNode>

            <CausalFlowArrow aria-hidden>
              <FiArrowRight size={16} />
            </CausalFlowArrow>

            <CausalFlowSelfNode>
              <CausalFlowSelfBadge>현재 사건</CausalFlowSelfBadge>
              <CausalFlowSelfTitle>{eventTitle}</CausalFlowSelfTitle>
              {selfDateText && (
                <CausalFlowSelfDate>{selfDateText}</CausalFlowSelfDate>
              )}
            </CausalFlowSelfNode>

            <CausalFlowArrow aria-hidden>
              <FiArrowRight size={16} />
            </CausalFlowArrow>

            <CausalFlowNode
              data-causal-dropzone="after"
              $dragOver={dragOverSide === 'after'}
              onDragOver={(dragEvent) => {
                dragEvent.preventDefault()
                if (dragOverSide !== 'after') setDragOverSide('after')
              }}
              onDragLeave={(dragEvent) => {
                if (
                  !dragEvent.currentTarget.contains(
                    dragEvent.relatedTarget as Node | null,
                  )
                ) {
                  setDragOverSide((current) =>
                    current === 'after' ? null : current,
                  )
                }
              }}
              onDrop={(dragEvent) => handleDropToSide(dragEvent, 'after')}
            >
              <CausalFlowHead>
                <span>이후 · 결과 사건</span>
                {afterItems.length > 0 && <CausalFlowCount>{afterItems.length}</CausalFlowCount>}
              </CausalFlowHead>
              {afterItems.length === 0 ? (
                <CausalFlowEmptySlot>
                  <CausalFlowEmpty>이 사건이 촉발했거나 뒤따라 일어난 후속·대응 사건</CausalFlowEmpty>
                  <CausalQuickAddBtn
                    type="button"
                    onClick={() => openPickerForDirection('outgoing')}
                  >
                    <FiPlus size={12} aria-hidden />
                    결과 사건 연결
                  </CausalQuickAddBtn>
                </CausalFlowEmptySlot>
              ) : (
                <CausalFlowPillList>
                  {(expandedCausalAfter ? afterItems : afterItems.slice(0, 3)).map((relation) =>
                    renderCausalPill(relation, '드래그하여 원인·동시대로 이동'),
                  )}
                  {afterItems.length > 3 && (
                    <CausalFlowMoreBtn
                      type="button"
                      onClick={() => setExpandedCausalAfter((previous) => !previous)}
                    >
                      {expandedCausalAfter ? '접기' : `+${afterItems.length - 3} 더 보기`}
                    </CausalFlowMoreBtn>
                  )}
                </CausalFlowPillList>
              )}
            </CausalFlowNode>
          </CausalFlowMainGrid>

          {(besideItems.length > 0 || draggingRelationId !== null) && (
            <CausalFlowBesideBar
              data-causal-dropzone="beside"
              $dragOver={dragOverSide === 'beside'}
              onDragOver={(dragEvent) => {
                dragEvent.preventDefault()
                if (dragOverSide !== 'beside') setDragOverSide('beside')
              }}
              onDragLeave={(dragEvent) => {
                if (
                  !dragEvent.currentTarget.contains(
                    dragEvent.relatedTarget as Node | null,
                  )
                ) {
                  setDragOverSide((current) =>
                    current === 'beside' ? null : current,
                  )
                }
              }}
              onDrop={(dragEvent) => handleDropToSide(dragEvent, 'beside')}
            >
              <CausalFlowBesideLabel>
                ↔ 병렬 · 동시대 ({besideItems.length})
              </CausalFlowBesideLabel>
              {besideItems.length === 0 ? (
                <CausalFlowEmpty>여기에 놓으면 동시대 관계로 전환</CausalFlowEmpty>
              ) : (
                besideItems.map((relation) =>
                  renderCausalPill(relation, '드래그하여 원인·결과로 이동'),
                )
              )}
            </CausalFlowBesideBar>
          )}

          {relations.length > 0 && (
            <CausalDetailToggleRow>
              <CausalDetailToggleBtn
                type="button"
                aria-expanded={showDetailList}
                onClick={() => setDetailListToggled(!showDetailList)}
              >
                {showDetailList ? <FiChevronUp size={13} aria-hidden /> : <FiChevronDown size={13} aria-hidden />}
                {showDetailList ? '상세 목록 접기' : `관계 사유 · 상세 목록 펼치기 (${relations.length}건)`}
              </CausalDetailToggleBtn>
            </CausalDetailToggleRow>
          )}
        </CausalFlowBoard>
      )}

      {showDetailList && groups.map((group) => {
        const folded = relations.length > LONG_LIST && group.items.length > GROUP_PREVIEW + 1 && !expandedGroups.has(group.key)
        const shownItems = folded ? group.items.slice(0, GROUP_PREVIEW) : group.items
        return (
        <Group
          key={group.key}
          role="group"
          aria-label={group.label}
          $dragOver={dragOverSide === group.side}
          onDragOver={(dragEvent) => {
            dragEvent.preventDefault()
            if (dragOverSide !== group.side) setDragOverSide(group.side)
          }}
          onDragLeave={(dragEvent) => {
            if (
              !dragEvent.currentTarget.contains(
                dragEvent.relatedTarget as Node | null,
              )
            ) {
              setDragOverSide((current) =>
                current === group.side ? null : current,
              )
            }
          }}
          onDrop={(dragEvent) => handleDropToSide(dragEvent, group.side)}
        >
          <GroupHead>
            <GroupArrow aria-hidden>
              {SIDE_GLYPH[group.side]}
            </GroupArrow>
            <GroupLabel title={group.hint}>
              {group.label}
              <GroupCount>{group.items.length}</GroupCount>
            </GroupLabel>
          </GroupHead>
          <NetStyles.ChildList>
            {shownItems.map((relation) => {
              const other = relation.event
              const category = eventDomainDef(other.domain)
              const dateLabel = counterpartDateLabel(other)
              const hasDescription = Boolean(relation.description?.trim())
              /* 날짜와 반대 방향 — 원인 쪽에 뒤 사건, 결과 쪽에 앞 사건(잇기 창엔 경고가 있지만 이미 이은 것은 말하지 않았다) */
              const reversed = directionConflicts(relation.relationType, relation.direction, self, startFieldsOf(other))
              return (
                <NetStyles.ChildRow
                  key={relation.id}
                  draggable
                  data-hot={hotEventId === other.id ? '' : undefined}
                  onDragStart={(dragEvent) => {
                    setDraggingRelationId(relation.id)
                    dragEvent.dataTransfer?.setData(
                      'text/plain',
                      `relation:${relation.id}`,
                    )
                  }}
                  onDragEnd={() => {
                    setDraggingRelationId(null)
                    setDragOverSide(null)
                  }}
                  onMouseEnter={() => onHoverEvent?.(other.id)}
                  onMouseLeave={() => onHoverEvent?.(null)}
                >
                  <NetStyles.ChildCard
                    to={pathKeys.events.detail(other.id)}
                    viewTransition
                    onMouseEnter={() => prefetchEvent(other.id)}
                    onFocus={() => prefetchEvent(other.id)}
                  >
                    <NetStyles.ChildEyebrow $cat={category}>
                      <span aria-hidden><category.Icon /></span>
                      {dateLabel || category.label}
                      <RelationTag title={EVENT_RELATION_LABELS[relation.relationType].hint}>
                        {EVENT_RELATION_LABELS[relation.relationType].name}
                      </RelationTag>
                      {reversed && (
                        <ReversedTag
                          as="button"
                          type="button"
                          onClick={(clickEvent) => {
                            clickEvent.preventDefault()
                            clickEvent.stopPropagation()
                            roleSwitchMutation.mutate({
                              relation,
                              targetSide: group.side === 'before' ? 'after' : 'before',
                            })
                          }}
                          title="상대 사건의 날짜가 이 칸과 반대입니다 — 클릭하면 반대 방향(원인 ↔ 결과)으로 바로 바꿉니다"
                        >
                          날짜와 방향 반대 · ⇄ 바로잡기
                        </ReversedTag>
                      )}
                    </NetStyles.ChildEyebrow>
                    <NetStyles.ChildBody>
                      <NetStyles.ChildTitle>{other.title}</NetStyles.ChildTitle>
                    </NetStyles.ChildBody>
                  </NetStyles.ChildCard>
                  <RowActions>
                    {!hasDescription && descriptionDraftId !== relation.id && (
                      <NetStyles.AddReasonBtn
                        type="button"
                        onClick={() => setDescriptionDraftId(relation.id)}
                        aria-label={`'${other.title}' 관계 설명 추가`}
                      >
                        <FiPlus aria-hidden /> 설명
                      </NetStyles.AddReasonBtn>
                    )}
                    <NetStyles.AddReasonBtn
                      type="button"
                      onClick={() => openEdit(relation)}
                      aria-label={`'${other.title}' 관계 유형·방향 편집`}
                    >
                      <FiEdit2 aria-hidden /> 편집
                    </NetStyles.AddReasonBtn>
                    <NetStyles.RemoveChildBtn
                      type="button"
                      onClick={() => void handleRemove(relation)}
                      aria-label={`'${other.title}' 관련 연결 해제`}
                    >
                      <FiX />
                    </NetStyles.RemoveChildBtn>
                  </RowActions>
                  {(hasDescription || descriptionDraftId === relation.id) && (
                    <NetStyles.ChildReasonRow
                      onBlur={(blurEvent) => {
                        const next = blurEvent.relatedTarget as Node | null
                        if (next && blurEvent.currentTarget.contains(next)) return
                        if (descriptionDraftId === relation.id) setDescriptionDraftId(null)
                      }}
                    >
                      <InlineText
                        value={relation.description ?? ''}
                        onSave={(next) =>
                          descriptionMutation.mutate({ relationId: relation.id, description: next })
                        }
                        placeholder="어떻게 이어지는지 한두 문장"
                        label={`'${other.title}' 관계 설명`}
                        multiline
                        maxLength={REASON_MAX}
                        showCount
                        style={{ flex: 1 }}
                        autoEdit={!hasDescription}
                        renderRead={(text) => <ReasonText text={text} />}
                      />
                    </NetStyles.ChildReasonRow>
                  )}
                </NetStyles.ChildRow>
              )
            })}
          </NetStyles.ChildList>
          {folded && (
            <MoreButton
              type="button"
              onClick={() => setExpandedGroups((previous) => new Set(previous).add(group.key))}
            >
              {group.items.length - GROUP_PREVIEW}건 더 보기
            </MoreButton>
          )}
        </Group>
        )
      })}

      {relatedModal}
    </NetStyles.HierBlock>
  )
}






const CausalFlowBoard = styled.div<{ $hasRelations: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 6px 0 ${({ $hasRelations }) => ($hasRelations ? '20px' : '4px')};
  margin-bottom: 4px;
  border-bottom: ${({ $hasRelations, theme }) =>
    $hasRelations ? `1px solid ${ledgerHairline(theme.mode)}` : 'none'};
`

const CausalFlowMainGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(170px, 0.85fr) auto minmax(0, 1fr);
  align-items: stretch;
  gap: 16px;

  @media (max-width: 760px) {
    grid-template-columns: minmax(0, 1fr);
    gap: 14px;
  }
`

const CausalFlowNode = styled.div<{ $dragOver?: boolean }>`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 14px;
  padding: 18px 20px;
  border: 1px solid ${({ theme }) => ledgerHairline(theme.mode)};
  border-left: 2.5px solid
    ${({ $dragOver, theme }) =>
      $dragOver ? ledgerAccent(theme.mode) : ledgerHairlineStrong(theme.mode)};
  border-radius: 8px;
  background: ${({ $dragOver, theme }) =>
    $dragOver ? ledgerAccentSubtle(theme.mode) : 'transparent'};
  outline: ${({ $dragOver, theme }) =>
    $dragOver ? `1.5px dashed ${ledgerAccent(theme.mode)}` : 'none'};
  outline-offset: 2px;
  min-width: 0;
  transition: border-color 0.14s ease, background 0.14s ease;
`

const CausalFlowHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  font-size: 12.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const CausalFlowCount = styled.span`
  font-variant-numeric: tabular-nums;
  font-size: 12px;
  font-weight: 600;
  color: ${metaText};
`

const CausalFlowEmpty = styled.span`
  font-size: 12.5px;
  line-height: 1.5;
  word-break: keep-all;
  color: ${metaText};
`

const CausalFlowEmptySlot = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
`

const CausalQuickAddBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 30px;
  padding: 0 11px;
  border-radius: 6px;
  border: 1px solid ${({ theme }) => ledgerHairlineStrong(theme.mode)};
  background: transparent;
  font: inherit;
  font-size: 12px;
  font-weight: 650;
  color: ${({ theme }) => theme.colors.text.primary};
  white-space: nowrap;
  cursor: pointer;
  transition: border-color 0.14s, color 0.14s;

  &:hover {
    border-color: ${({ theme }) => ledgerAccent(theme.mode)};
    color: ${({ theme }) => ledgerAccent(theme.mode)};
  }
`

const CausalFlowPillList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
`

const CausalFlowPill = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  max-width: 100%;
  padding: 2px 6px 2px 8px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.06)'};
  cursor: grab;

  &:active {
    cursor: grabbing;
  }
`

const CausalFlowPillLink = styled(Link)`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 190px;
  color: inherit;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
    text-underline-offset: 2px;
  }
`

const CausalFlowPillEdit = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: ${metaText};
  cursor: pointer;
  flex-shrink: 0;

  &:hover {
    color: ${({ theme }) => ledgerAccent(theme.mode)};
  }
`

const CausalDetailToggleRow = styled.div`
  display: flex;
  justify-content: flex-end;
  padding-top: 2px;
`

const CausalDetailToggleBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 4px;
  border: none;
  background: transparent;
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  color: ${metaText};
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const CausalFlowPillRemove = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: ${metaText};
  font-size: 12px;
  line-height: 1;
  cursor: pointer;
  flex-shrink: 0;

  &:hover {
    color: ${({ theme }) => theme.colors.error};
    background: rgba(239, 68, 68, 0.12);
  }
`

const CausalFlowMoreBtn = styled.button`
  padding: 2px 6px;
  border: none;
  border-radius: 999px;
  background: transparent;
  font-family: inherit;
  font-size: 11.5px;
  font-weight: 600;
  color: ${metaText};
  align-self: center;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
    text-decoration: underline;
    text-underline-offset: 2px;
  }
`

const CausalFlowArrow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${metaText};
  opacity: 0.7;
  user-select: none;

  @media (max-width: 760px) {
    display: none;
  }
`

const CausalFlowSelfNode = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 4px;
  padding: 14px 16px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => ledgerAccent(theme.mode)};
  background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  text-align: center;
  min-width: 0;
`

const CausalFlowSelfBadge = styled.span`
  font-size: 10.5px;
  font-weight: 800;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
`

const CausalFlowSelfTitle = styled.span`
  font-size: 12.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const CausalFlowSelfDate = styled.span`
  font-size: 11px;
  color: ${metaText};
`

const CausalFlowBesideBar = styled.div<{ $dragOver?: boolean }>`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  padding: 6px 2px 0;
  border-top: 1px dashed
    ${({ $dragOver, theme }) =>
      $dragOver ? ledgerAccent(theme.mode) : ledgerHairline(theme.mode)};
  background: ${({ $dragOver, theme }) =>
    $dragOver ? ledgerAccentSubtle(theme.mode) : 'transparent'};
`

const CausalFlowBesideLabel = styled.span`
  font-size: 11.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-right: 2px;
`

const Group = styled.div<{ $dragOver?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 2px;
  border-radius: 8px;
  outline: ${({ $dragOver, theme }) =>
    $dragOver ? `2px dashed ${ledgerAccent(theme.mode)}` : 'none'};
  outline-offset: 2px;
`

/** 묶음 머리 — 화살표(이 사건과의 선후) + 이 사건을 주어로 한 문장 + 유형 뜻풀이 */
const GroupHead = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 2px 8px;
  margin-top: 4px;
`

const GroupArrow = styled.span`
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
`

const GroupLabel = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const GroupCount = styled.span`
  margin-left: 6px;
  font-weight: 400;
  color: ${metaText};
`





/** 행 오른쪽 편집 크롬 — ChildRow의 hover-reveal 스코프가 AddReasonBtn·RemoveChildBtn을 연다 */
const RowActions = styled.div`
  position: absolute;
  top: 10px;
  right: 8px;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 4px;

  /* 버튼 원형은 행 기준 absolute로 서 있다 — 이 줄 안에서는 흐름으로 나란히 */
  && > * {
    position: static;
  }
`

/**
 * 관계 이유 — 두 줄까지만, 넘치면 '더 보기'. 이유 글이 길면(연맹제 8건 평균 2.6줄) 줄마다 키가 달라
 * 목록이 들쭉날쭉했다. 편집은 옆 연필(InlineText)이 그대로 맡는다.
 */
function ReasonText({ text }: { text: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const [expanded, setExpanded] = useState(false)
  const [overflowing, setOverflowing] = useState(false)
  useLayoutEffect(() => {
    const element = ref.current
    if (!element || expanded) return
    setOverflowing(element.scrollHeight > element.clientHeight + 1)
  }, [text, expanded])
  return (
    <>
      <ReasonClamp ref={ref} data-expanded={expanded || undefined}>
        {text}
      </ReasonClamp>
      {(overflowing || expanded) && (
        <ReasonToggle type="button" onClick={() => setExpanded((previous) => !previous)} aria-expanded={expanded}>
          {expanded ? '접기' : '더 보기'}
        </ReasonToggle>
      )}
    </>
  )
}

const ReasonClamp = styled.span`
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;

  &[data-expanded] {
    display: block;
    -webkit-line-clamp: unset;
  }
`

const ReasonToggle = styled.button`
  padding: 0;
  border: none;
  background: transparent;
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  color: ${metaText};
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.text.secondary};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => ledgerAccent(theme.mode)};
    outline-offset: 2px;
    border-radius: 4px;
  }
`

const MoreButton = styled(ReasonToggle)`
  align-self: flex-start;
  min-height: 28px;
  margin-left: 4px;
  font-size: 12.5px;
`

/**
 * 관계 종류 꼬리표 — 묶음을 원인/결과/곁 셋으로 줄이며 행으로 내려온 종류. 날짜 줄 끝, 분류 색이 아닌 메타 글씨.
 * span이 아니라 small — 날짜 줄의 '> span'(18px 아이콘 상자) 규칙에 걸려 글자가 세로로 꺾이고 분류 색을 입었다
 */
const RelationTag = styled.small`
  flex-shrink: 0;
  white-space: nowrap;
  margin-left: 2px;
  line-height: 16px;
  padding: 0 6px;
  border-radius: 4px;
  border: 1px solid ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.12)')};
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0;
  color: ${metaText};
`

/** 방향·날짜 어긋남 — 호박색(주의). 클릭 시 반대 방향(원인 ↔ 결과)으로 즉시 교정 */
const ReversedTag = styled(RelationTag)`
  background: transparent;
  font-family: inherit;
  cursor: pointer;
  border-color: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(251,191,36,0.4)' : 'rgba(180,83,9,0.35)')};
  color: ${({ theme }) => (theme.mode === 'dark' ? '#fbbf24' : '#b45309')};

  &:hover {
    background: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(251,191,36,0.12)' : 'rgba(180,83,9,0.08)')};
  }
`
