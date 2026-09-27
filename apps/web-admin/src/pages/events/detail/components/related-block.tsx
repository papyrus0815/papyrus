import { useMemo, useState } from 'react'

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FiArrowRight, FiPlus, FiX } from 'react-icons/fi'
import styled from 'styled-components'

import {
  RADIUS,
  ledgerAccent,
  resolveCategory,
} from '@/pages/events/ledger/styles/ledger-tokens'
import { metaText } from '@/pages/events/styles/theme'
import { formatDateRange } from '@/pages/events/utils/events.utils'
import {
  DIRECTED_RELATION_TYPES,
  EVENT_RELATION_GROUP_ORDER,
  EVENT_RELATION_LABELS,
  type EventRelationCounterpart,
  type EventRelationDirection,
  type EventRelationItem,
  type EventRelationType,
  createEventRelation,
  deleteEventRelation,
  relationGroupKey,
  updateEventRelation,
} from '@/shared/api/event-relations'
import { type EventLinkCandidate, getEventLinkCandidates } from '@/shared/api/events'
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value'
import { formatYearLabel } from '@/shared/lib/iso-date'
import { pathKeys } from '@/shared/router'
import { confirm } from '@/shared/ui/confirm-dialog'
import { InlineText } from '@/shared/ui/inline-edit'
import { SegmentControl } from '@/shared/ui/segment-control/segment-control'
import { SelectModal, type SelectOption } from '@/shared/ui/select-modal/select-modal'
import { notify } from '@/shared/ui/toast'

import { usePrefetchEventDetail } from '../use-event-detail'
import { eventRelationKeys, useEventRelations } from '../use-event-relations'
import { REASON_MAX } from './detail-network.lib'
import * as NetStyles from './detail-network.styles'

/**
 * 관련 사건 블록 — 상위/하위(계보 소속)로는 묶을 수 없는 **별개 사건끼리의 연결**.
 * 예: '아바르 칸국 건국' —계기가 됨→ '롬바르드 왕국 건국'.
 *
 * 한 관계는 양쪽 사건에 모두 보이고, 방향이 있는 유형은 이 사건 쪽 문구로 읽힌다
 * (롬바르드 쪽에선 '계기가 된 사건: 아바르 칸국 건국', 아바르 쪽에선 '이 사건으로 일어난 사건').
 * 묶음 순서는 앞 사건(원인 쪽) → 뒤 사건(결과 쪽) → 무방향.
 *
 * 추가 흐름: 사건 고르기(서버 검색 픽커) → 유형·방향·설명을 고르는 작성 줄 → 연결.
 * 이미 연결된 사건을 고르면 새로 만들지 않고 그 관계의 수정으로 들어간다(한 쌍 한 행).
 */

interface RelatedBlockProps {
  eventId: string
  eventTitle: string
}

/** 작성 줄 상태 — 새 연결(relationId 없음) 또는 기존 관계 수정 */
interface Draft {
  relationId?: string
  other: { id: string; title: string }
  relationType: EventRelationType
  direction: EventRelationDirection
  description: string
}

const TYPE_OPTIONS: Array<{ value: EventRelationType; label: string }> = (
  ['LED_TO', 'INFLUENCED', 'RESPONSE_TO', 'CONCURRENT', 'RELATED'] as const
).map((type) => ({ value: type, label: EVENT_RELATION_LABELS[type].name }))

/** 저장 방향으로 읽는 한 문장 — 작성 줄 미리보기 */
function relationSentence(
  type: EventRelationType,
  direction: EventRelationDirection,
  selfTitle: string,
  otherTitle: string,
): string {
  const [from, to] =
    direction === 'outgoing' ? [selfTitle, otherTitle] : [otherTitle, selfTitle]
  switch (type) {
    case 'LED_TO':
      return `‘${from}’이(가) ‘${to}’의 직접 계기가 되었다`
    case 'INFLUENCED':
      return `‘${from}’이(가) ‘${to}’의 배경이 되었다`
    case 'RESPONSE_TO':
      return `‘${to}’은(는) ‘${from}’에 대한 대응이다`
    case 'CONCURRENT':
      return `‘${selfTitle}’과(와) ‘${otherTitle}’은(는) 같은 국면에서 얽혀 진행되었다`
    default:
      return `‘${selfTitle}’과(와) ‘${otherTitle}’은(는) 관련이 있다`
  }
}

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

function candidateDateLabel(candidate: EventLinkCandidate): string | null {
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

export function RelatedBlock({ eventId, eventTitle }: RelatedBlockProps) {
  const queryClient = useQueryClient()
  const prefetchEvent = usePrefetchEventDetail()
  const { data: relations = [], isError } = useEventRelations(eventId)

  const [pickerOpen, setPickerOpen] = useState(false)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [descriptionDraftId, setDescriptionDraftId] = useState<string | null>(null)

  // ── 후보 검색(서버) — 상위/하위 픽커와 같은 link-candidates 엔드포인트 ──
  const [searchTerm, setSearchTerm] = useState('')
  const debouncedTerm = useDebouncedValue(searchTerm, 250, String(pickerOpen))
  const candidatesQuery = useQuery({
    queryKey: ['events', 'link-candidates', debouncedTerm],
    queryFn: () => getEventLinkCandidates({ query: debouncedTerm, limit: 51 }),
    enabled: pickerOpen,
    staleTime: 60_000,
    placeholderData: keepPreviousData,
    retry: 1,
  })
  const relatedIds = useMemo(
    () => new Map(relations.map((relation) => [relation.event.id, relation])),
    [relations],
  )
  const candidateOptions = useMemo<SelectOption[]>(
    () =>
      (candidatesQuery.data ?? [])
        .slice(0, 50)
        .filter((candidate) => candidate.id !== eventId)
        .map((candidate) => {
          const existing = relatedIds.get(candidate.id)
          const parts = [
            candidateDateLabel(candidate),
            existing
              ? `이미 연결됨(${EVENT_RELATION_LABELS[existing.relationType].name}) — 고르면 수정`
              : null,
          ].filter(Boolean)
          return {
            value: candidate.id,
            label: candidate.title,
            description: parts.length ? parts.join(' · ') : undefined,
          }
        }),
    [candidatesQuery.data, eventId, relatedIds],
  )

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: eventRelationKeys.all })

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
      notify.success(next.relationId ? '관계를 수정했습니다' : `‘${next.other.title}’과(와) 연결했습니다`)
      setDraft(null)
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

  const openEdit = (relation: EventRelationItem) =>
    setDraft({
      relationId: relation.id,
      other: { id: relation.event.id, title: relation.event.title },
      relationType: relation.relationType,
      direction: relation.direction,
      description: relation.description ?? '',
    })

  const handlePick = (pickedId: string) => {
    setPickerOpen(false)
    setSearchTerm('')
    const existing = relatedIds.get(pickedId)
    if (existing) {
      openEdit(existing)
      return
    }
    const candidate = candidatesQuery.data?.find((item) => item.id === pickedId)
    setDraft({
      other: { id: pickedId, title: candidate?.title ?? '선택한 사건' },
      // 가장 흔한 쓰임(앞 사건이 계기) — 방향은 날짜로 추정: 상대가 더 이르면 상대 → 이 사건
      relationType: 'LED_TO',
      direction: 'incoming',
      description: '',
    })
  }

  const handleRemove = async (relation: EventRelationItem) => {
    const ok = await confirm({
      title: '관련 사건 연결 해제',
      message: `‘${relation.event.title}’과(와)의 연결을 해제할까요? 두 사건 모두에서 사라집니다.`,
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
      return [{ key: `${type}:${direction}`, label: EVENT_RELATION_LABELS[type][direction], items }]
    })
  }, [relations])

  return (
    <NetStyles.HierBlock role="group" aria-labelledby="network-related-label">
      <NetStyles.BlockLabel id="network-related-label">관련 사건</NetStyles.BlockLabel>

      {isError && <NetStyles.HelperNote>관련 사건을 불러오지 못했습니다</NetStyles.HelperNote>}

      {groups.map((group) => (
        <Group key={group.key} role="group" aria-label={group.label}>
          <GroupLabel>{group.label}</GroupLabel>
          <NetStyles.ChildList>
            {group.items.map((relation) => {
              const other = relation.event
              const category = resolveCategory(other.categoryName ?? undefined)
              const dateLabel = counterpartDateLabel(other)
              const hasDescription = Boolean(relation.description?.trim())
              return (
                <NetStyles.ChildRow key={relation.id}>
                  <NetStyles.ChildCard
                    to={pathKeys.events.detail(other.id)}
                    viewTransition
                    onMouseEnter={() => prefetchEvent(other.id)}
                    onFocus={() => prefetchEvent(other.id)}
                  >
                    <NetStyles.ChildEyebrow $cat={category}>
                      <span aria-hidden>{category.icon}</span>
                      {dateLabel || (other.categoryName ?? '기타')}
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
                      유형
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
                      />
                    </NetStyles.ChildReasonRow>
                  )}
                </NetStyles.ChildRow>
              )
            })}
          </NetStyles.ChildList>
        </Group>
      ))}

      {draft && (
        <Composer
          role="group"
          aria-label={draft.relationId ? '관계 수정' : '새 관련 사건 연결'}
          onKeyDown={(keyEvent) => {
            if (keyEvent.key === 'Escape') {
              keyEvent.stopPropagation()
              setDraft(null)
            }
          }}
        >
          <ComposerTitle>
            {draft.relationId ? '관계 수정' : '연결할 사건'} · <strong>{draft.other.title}</strong>
          </ComposerTitle>

          <ComposerField>
            <ComposerLabel>관계</ComposerLabel>
            <SegmentControl
              value={draft.relationType}
              onChange={(value) => setDraft({ ...draft, relationType: value as EventRelationType })}
              options={TYPE_OPTIONS}
              ariaLabel="관계 유형"
            />
          </ComposerField>

          {DIRECTED_RELATION_TYPES.has(draft.relationType) && (
            <ComposerField>
              <ComposerLabel>방향</ComposerLabel>
              <SegmentControl
                value={draft.direction}
                onChange={(value) =>
                  setDraft({ ...draft, direction: value as EventRelationDirection })
                }
                options={[
                  {
                    value: 'incoming',
                    label: (
                      <DirectionLabel>
                        상대 <FiArrowRight aria-hidden /> 이 사건
                      </DirectionLabel>
                    ),
                  },
                  {
                    value: 'outgoing',
                    label: (
                      <DirectionLabel>
                        이 사건 <FiArrowRight aria-hidden /> 상대
                      </DirectionLabel>
                    ),
                  },
                ]}
                ariaLabel="관계 방향"
              />
            </ComposerField>
          )}

          <Preview aria-live="polite">
            {relationSentence(draft.relationType, draft.direction, eventTitle, draft.other.title)}
          </Preview>

          <DescriptionInput
            value={draft.description}
            onChange={(changeEvent) => setDraft({ ...draft, description: changeEvent.target.value })}
            placeholder="어떻게 이어지는지 한두 문장 (선택) — 예: 아바르에 판노니아를 넘기고 이탈리아로 이주"
            maxLength={REASON_MAX}
            rows={2}
            aria-label="관계 설명"
          />

          <ComposerActions>
            <NetStyles.TextBtn type="button" onClick={() => setDraft(null)}>
              취소
            </NetStyles.TextBtn>
            <NetStyles.StageCommitBtn
              type="button"
              disabled={saveMutation.isPending}
              onClick={() => saveMutation.mutate(draft)}
            >
              {saveMutation.isPending ? '저장 중…' : draft.relationId ? '수정' : '연결'}
            </NetStyles.StageCommitBtn>
          </ComposerActions>
        </Composer>
      )}

      {!draft && (
        <NetStyles.HierRow>
          <NetStyles.AddBtn type="button" onClick={() => setPickerOpen(true)}>
            <FiPlus /> 관련 사건 연결
          </NetStyles.AddBtn>
          {relations.length === 0 && !isError && (
            <NetStyles.HelperNote>
              계기·배경·대응처럼 상위/하위가 아닌 사건끼리의 연결
            </NetStyles.HelperNote>
          )}
        </NetStyles.HierRow>
      )}

      <SelectModal
        isOpen={pickerOpen}
        onClose={() => {
          setPickerOpen(false)
          setSearchTerm('')
        }}
        title="관련 사건 연결"
        options={candidateOptions}
        onSelect={handlePick}
        searchable
        searchPlaceholder="사건명으로 검색"
        isLoading={candidatesQuery.isLoading}
        isSearching={candidatesQuery.isFetching || searchTerm !== debouncedTerm}
        hasError={candidatesQuery.isError}
        onRetry={() => void candidatesQuery.refetch()}
        onQueryChange={setSearchTerm}
      />
    </NetStyles.HierBlock>
  )
}

const Group = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`

/** 묶음 머리 — 이 사건 쪽에서 읽는 관계 문구('계기가 된 사건' 등) */
const GroupLabel = styled.span`
  font-size: 12.5px;
  font-weight: 600;
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

const Composer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px 16px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: ${RADIUS.MD};
`

const ComposerTitle = styled.div`
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.secondary};

  strong {
    color: ${({ theme }) => theme.colors.text.primary};
    font-weight: 700;
  }
`

const ComposerField = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
`

const ComposerLabel = styled.span`
  min-width: 32px;
  font-size: 12.5px;
  font-weight: 600;
  color: ${metaText};
`

const DirectionLabel = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
`

/** 저장될 관계를 한 문장으로 — 방향을 잘못 고르는 실수를 고르는 순간 보이게 */
const Preview = styled.p`
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
`

const DescriptionInput = styled.textarea`
  width: 100%;
  box-sizing: border-box;
  padding: 8px 10px;
  font-family: inherit;
  font-size: 13.5px;
  line-height: 1.5;
  resize: vertical;
  color: ${({ theme }) => theme.colors.text.primary};
  background: transparent;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: ${RADIUS.SM};

  &:focus {
    outline: none;
    border-color: ${({ theme }) => ledgerAccent(theme.mode)};
  }
`

const ComposerActions = styled.div`
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 12px;
`
