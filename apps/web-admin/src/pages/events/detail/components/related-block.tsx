import { useLayoutEffect, useMemo, useRef, useState } from 'react'

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FiPlus, FiX } from 'react-icons/fi'
import styled from 'styled-components'

import { ledgerAccent } from '@/entities/event/ui/ledger-tokens'
import { eventDomainDef } from '@/entities/event/model/event-domain'
import { metaText } from '@/pages/events/styles/theme'
import { formatDateRange } from '@/pages/events/utils/events.utils'
import {
  DIRECTED_RELATION_TYPES,
  EVENT_RELATION_GROUP_ORDER,
  EVENT_RELATION_LABELS,
  type EventRelationCounterpart,
  type EventRelationDirection,
  type EventRelationItem,
  createEventRelation,
  deleteEventRelation,
  relationGroupKey,
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
import { REASON_MAX } from './detail-network.lib'
import { type LinkCandidate, type RelatedLinkFilter, type RelationDraft, RelatedLinkModal } from './related-link-modal'
import { type PickerEvent, byProximity, particle, signedStartYear } from './related-picker.lib'
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
}

type Draft = RelationDraft

/** 묶음의 자리 — 이 사건보다 앞선 원인 쪽 · 뒤따른 결과 쪽 · 곁 */
type GroupSide = 'before' | 'after' | 'beside'
const SIDE_GLYPH: Record<GroupSide, string> = { before: '←', after: '→', beside: '↔' }
const SIDE_TITLE: Record<GroupSide, string> = {
  before: '이 사건보다 앞선 원인 쪽',
  after: '이 사건이 낳은 결과 쪽',
  beside: '같은 때 얽힌 사건',
}

/**
 * 긴 목록 접기 — 관련 사건이 이보다 많으면 종류 묶음마다 앞의 몇 건만 보이고 나머지는 '더 보기'.
 * NSPM-2(관계 5)·연맹제(8)에서 이유 글까지 펼친 목록이 지도 아래 1,000px를 넘겼다.
 */
const LONG_LIST = 6
const GROUP_PREVIEW = 3

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
}: RelatedBlockProps) {
  const queryClient = useQueryClient()
  const prefetchEvent = usePrefetchEventDetail()
  const { data: relations = [], isError } = useEventRelations(eventId)

  /* 잇기 창 — 고르기와 정하기를 한 창에서(예전엔 고르면 창이 닫히고 작성 줄이 본문 아래에 따로 열렸다) */
  const [pickerOpen, setPickerOpen] = useState(false)
  const [initialDraft, setInitialDraft] = useState<Draft | null>(null)
  const [descriptionDraftId, setDescriptionDraftId] = useState<string | null>(null)
  /** 잇기 창을 열 때의 거르기 — '같은 키워드 후보 N'은 키워드로 거른 채 연다 */
  const [pickerFilter, setPickerFilter] = useState<RelatedLinkFilter>('all')
  /** 긴 목록에서 펼친 묶음 */
  const [expandedGroups, setExpandedGroups] = useState<ReadonlySet<string>>(() => new Set())

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

  /** 이미 이은 사건은 후보에서 뺀다(연결 직후 목록이 바로 줄어든다) */
  const visibleSuggestions = suggestions.filter((suggestion) => !relatedIds.has(suggestion.id))

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
  }

  const handleRemove = async (relation: EventRelationItem) => {
    const ok = await confirm({
      title: '관련 사건 연결 해제',
      message: `‘${relation.event.title}’${particle(relation.event.title, '과/와')}의 연결을 해제할까요? 두 사건 모두에서 사라집니다.`,
      confirmLabel: '해제',
    })
    if (ok) removeMutation.mutate(relation.id)
  }

  // 묶음 — 정해진 순서대로, 빈 묶음은 건너뛴다
  const groups = useMemo(() => {
    const byKey = new Map<string, EventRelationItem[]>()
    for (const relation of relations) {
      const key = relationGroupKey(relation)
      byKey.set(key, [...(byKey.get(key) ?? []), relation])
    }
    return EVENT_RELATION_GROUP_ORDER.flatMap(({ type, direction }) => {
      const items = byKey.get(`${type}:${direction}`)
      if (!items?.length) return []
      /* 원인 쪽(이 사건보다 앞) · 결과 쪽(뒤) · 곁(같은 때·그 밖) — 머리의 화살표가 이 사건과의 선후를 말한다 */
      const side: GroupSide = !DIRECTED_RELATION_TYPES.has(type)
        ? 'beside'
        : direction === 'incoming'
          ? 'before'
          : 'after'
      return [
        {
          key: `${type}:${direction}`,
          label: EVENT_RELATION_LABELS[type][direction],
          hint: EVENT_RELATION_LABELS[type].hint,
          side,
          items,
        },
      ]
    })
  }, [relations])

  return (
    <NetStyles.HierBlock
      role="group"
      aria-labelledby="network-related-label"
    >

      {isError && <NetStyles.HelperNote>관련 사건을 불러오지 못했습니다</NetStyles.HelperNote>}

      {groups.map((group) => {
        const folded = relations.length > LONG_LIST && group.items.length > GROUP_PREVIEW + 1 && !expandedGroups.has(group.key)
        const shownItems = folded ? group.items.slice(0, GROUP_PREVIEW) : group.items
        return (
        <Group key={group.key} role="group" aria-label={group.label}>
          <GroupHead>
            <GroupArrow aria-hidden title={SIDE_TITLE[group.side]}>
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
              return (
                <NetStyles.ChildRow
                  key={relation.id}
                  data-hot={hotEventId === other.id ? '' : undefined}
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
                      aria-label={`'${other.title}' 관계 유형·방향 수정`}
                    >
                      관계 바꾸기
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

      <NetStyles.HierRow>
        <NetStyles.AddBtn type="button" onClick={() => setPickerOpen(true)}>
          <FiPlus /> 기존 사건과 잇기
        </NetStyles.AddBtn>
        {onOpenCreateRelated && (
          <NetStyles.AddBtn type="button" onClick={onOpenCreateRelated}>
            <FiPlus /> 새 관련 사건 등록
          </NetStyles.AddBtn>
        )}
        {/*
          * 같은 키워드의 사건 — 예전엔 버튼 아래 접힌 상자에 따로 있었고, 잇기 창에도 '같은 키워드' 거르기가 있어
          * 같은 후보가 두 자리에 있었다. 한 자리(잇기 창)로 — 누르면 키워드로 거른 채 열린다. 이미 이은 사건은 빠진 수.
          */}
        {visibleSuggestions.length > 0 && (
          <NetStyles.TextBtn
            type="button"
            onClick={() => {
              setPickerFilter('keyword')
              setPickerOpen(true)
            }}
            title="이미 적어 둔 키워드가 겹치는 사건 — 잇기 창에서 키워드로 거른 채 열립니다"
          >
            같은 키워드 후보 {visibleSuggestions.length}
          </NetStyles.TextBtn>
        )}
      </NetStyles.HierRow>


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
    </NetStyles.HierBlock>
  )
}






const Group = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
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
