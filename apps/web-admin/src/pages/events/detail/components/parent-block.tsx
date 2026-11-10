import { useEffect, useMemo, useState, type RefObject } from 'react'

import { FiChevronLeft, FiChevronRight, FiPlus, FiX } from 'react-icons/fi'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'

import { eventKeys } from '@/shared/api/event-query-keys'
import { type UpdateEventDto, getEventsByParentId } from '@/shared/api/events'
import { formatYearLabel } from '@/shared/lib/iso-date'
import { pathKeys } from '@/shared/router'
import { InlineText } from '@/shared/ui/inline-edit'
import { SelectModal } from '@/shared/ui/select-modal/select-modal'

import { type EventDetail, usePrefetchEventDetail } from '../use-event-detail'
import { REASON_MAX, compareEventStart } from './detail-network.lib'
import { assignPhases, phaseRangeLabel, phaseReach, phaseReachLabel } from './event-phase.lib'
import { type PickerEvent, signedEndYear, signedStartYear, yearsOutsideParent } from './related-picker.lib'
import * as NetStyles from './detail-network.styles'

const REASON_PLACEHOLDER =
  '이 사건이 상위와 어떻게 이어지는지 한두 문장 (예: 병합을 서두르게 만든 직접적 계기)'

interface ParentBlockProps {
  event: EventDetail
  /** 추가 상위 목록 — 컨테이너의 patch 조립(extraIdsRef)과 같은 원본을 공유. */
  extraParents: NonNullable<EventDetail['extraParents']>
  onOpenParentModal: () => void
  onOpenExtrasModal: () => void
  onReleaseParent: () => void
  onPromoteExtraParent: (targetId: string) => void
  onRemoveExtraParent: (targetId: string) => void
  onPatch: (patch: UpdateEventDto, opts?: { savedLabel?: string }) => void
  /** 추가 상위 칩 제거 버튼 ref 맵 — 컨테이너 removeExtraParent의 포커스 이양이 참조. */
  extraRemoveRefs: RefObject<Map<string, HTMLButtonElement>>
  /** 추가 상위 '추가' 버튼 ref — 마지막 칩 제거 시 포커스 폴백. */
  extrasAddRef: RefObject<HTMLButtonElement | null>
}

/**
 * 상위 사건 블록 — 주 상위 행(지정/변경/해제) + 연결 사유 + 추가 상위 칩 행
 * (사유 편집·승격·해제) + 형제(같은 상위) 네비.
 *
 * 상위 지정/해제의 confirm 연쇄·patch 조립은 컨테이너(detail-network) 몫 —
 * 이 블록은 표시와 로컬 UI 상태(사유 편집 펼침·형제 조회)만 가진다.
 */
export function ParentBlock({
  event,
  extraParents,
  onOpenParentModal,
  onOpenExtrasModal,
  onReleaseParent,
  onPromoteExtraParent,
  onRemoveExtraParent,
  onPatch,
  extraRemoveRefs,
  extrasAddRef,
}: ParentBlockProps) {
  const prefetchEvent = usePrefetchEventDetail()
  const parentEvent = event.parentEvent

  // 추가 상위 칩의 연결 사유 편집 라인 — 한 번에 하나만 펼침(칩 행 밀도 유지).
  const [openExtraReasonId, setOpenExtraReasonId] = useState<string | null>(null)
  const extraIds = useMemo(
    () => extraParents.map((extra) => extra.id),
    [extraParents],
  )
  // 사유 편집 open 상태가 해제된 칩 id로 잔존하면 같은 사건을 재연결할 때 편집 라인이
  // 유령처럼 재개방된다 — 현재 extras에 없는 id면 리셋.
  useEffect(() => {
    if (openExtraReasonId && !extraIds.includes(openExtraReasonId)) {
      setOpenExtraReasonId(null)
    }
  }, [extraIds, openExtraReasonId])

  /**
   * 연결 사유 저장 — 부분 업서트. 빈 문자열은 서버가 삭제로 정규화(행 제거).
   * parentLinkReasons: 이 사건이 자식인 쌍(주 상위·추가 상위). 링크가 실제로 있는
   * 쌍에만 유효 — UI는 이미 연결된 항목 옆에서만 편집을 노출한다.
   */
  const saveParentReason = (parentId: string, next: string) => {
    onPatch({
      parentLinkReasons: [{ parentEventId: parentId, reason: next }],
    } as UpdateEventDto)
  }

  /* 형제(같은 상위) 사건 — 하위 사건 상세에서 부모 왕복 없이 이전/다음으로 이동.
   * 상위가 있을 때만 조회. 부모의 하위 목록(미삭제)을 시간순 정렬해 현재 위치의 앞뒤를 잡는다. */
  const { data: siblings = [] } = useQuery({
    queryKey: eventKeys.siblings(event.parentEventId),
    queryFn: () => getEventsByParentId(event.parentEventId as string),
    enabled: Boolean(event.parentEventId),
    staleTime: 60_000,
  })
  const sortedSiblings = useMemo(
    () =>
      siblings
        .slice()
        .sort((first, second) =>
          compareEventStart(first.startDate, second.startDate),
        ),
    [siblings],
  )
  const siblingIndex = sortedSiblings.findIndex(
    (sibling) => sibling.id === event.id,
  )
  const prevSibling = siblingIndex > 0 ? sortedSiblings[siblingIndex - 1] : null
  const nextSibling =
    siblingIndex >= 0 && siblingIndex < sortedSiblings.length - 1
      ? sortedSiblings[siblingIndex + 1]
      : null

  /*
   * 국면 — 상위 사건을 시간으로 나눈 장 중 이 사건이 든 곳. 손으로 넣은 게 없으면 시작일로 자동.
   * 국면은 사건이 아니라 목차라서 상위를 바꾸지 않고 '몇 국면'만 고친다.
   */
  const parentChapters = useMemo(
    () => [...(parentEvent?.phases ?? [])].sort((left, right) => left.order - right.order),
    [parentEvent?.phases],
  )
  const autoChapter = useMemo(
    () =>
      assignPhases(parentChapters, [
        { id: event.id, phaseId: null, startDate: event.startDate, startDatePrecision: event.startDatePrecision },
      ]).get(event.id)?.phaseId ?? null,
    [parentChapters, event.id, event.startDate, event.startDatePrecision],
  )
  const manualChapter = parentChapters.some((chapter) => chapter.id === event.phaseId) ? (event.phaseId ?? null) : null
  const currentChapterId = manualChapter ?? autoChapter
  const chapterName = (id: string | null) => {
    const position = parentChapters.findIndex((chapter) => chapter.id === id)
    return position >= 0 ? `${position + 1}국면 · ${parentChapters[position].title}` : '국면 밖'
  }
  const [chapterPickerOpen, setChapterPickerOpen] = useState(false)
  /** 주 상위 사유 적기 — 비어 있으면 줄을 세우지 않고, '사유'를 누르면 편집 칸으로 연다 */
  const [reasonEditing, setReasonEditing] = useState(false)

  /* 소속 경로 — 상위의 상위까지(3단, 더 있으면 …). 이 줄이 소속의 본체다 */
  const chain: Array<{ id: string; title: string }> = []
  let ancestor = parentEvent
  while (ancestor && chain.length < 3) {
    chain.unshift({ id: ancestor.id, title: ancestor.title })
    ancestor = ancestor.parentEvent
  }
  const chainTruncated = Boolean(ancestor)
  const hasReason = Boolean(event.parentLinkReason?.trim())
  /* 날짜가 상위 기간 밖 — 오타(1793 → 1973)이거나 상위를 잘못 고른 것. BC는 구조화 연도로 */
  const selfYear = signedStartYear(event as unknown as PickerEvent)
  const parentStartYear = parentEvent ? signedStartYear(parentEvent as unknown as PickerEvent) : null
  const parentEndYear = parentEvent ? signedEndYear(parentEvent as unknown as PickerEvent) : null
  const outsideBy = yearsOutsideParent(selfYear, parentStartYear, parentEndYear)
  const reach = phaseReach(parentChapters, {
    id: event.id,
    phaseId: manualChapter,
    startDate: event.startDate,
    startDatePrecision: event.startDatePrecision,
    endDate: event.endDate,
    endDatePrecision: event.endDatePrecision,
  })

  /*
   * 소속 한 줄 — 예전엔 맨 위 경로 줄 아래에 '소속' 칸이 또 서서 '상위 사건: 국민공회기'를 한 번 더 말했고(287px, 휴대폰 392),
   * 비어 있는 '연결 사유 추가'·'추가 상위 + 추가' 줄이 늘 섰다. 이제 경로 줄 하나 + 국면·이전/다음 한 줄씩.
   * 사유·추가 상위는 값이 있을 때만 줄로, 없으면 경로 줄 끝의 '사유'·'추가 상위' 버튼(올리면 보임)으로.
   */
  return (
    <NetStyles.MembershipBar role="group" aria-label="소속">
      <NetStyles.MembershipRow $reveal>
        <NetStyles.MembershipLabel>소속</NetStyles.MembershipLabel>
        {parentEvent ? (
          <>
            {chainTruncated && <span aria-hidden title="더 상위 사건이 있습니다">… ›</span>}
            {chain.map((step) => (
              <span key={step.id}>
                <Link
                  to={pathKeys.events.detail(step.id)}
                  viewTransition
                  onMouseEnter={() => prefetchEvent(step.id)}
                  onFocus={() => prefetchEvent(step.id)}
                >
                  {step.title}
                </Link>
                <span aria-hidden> › </span>
              </span>
            ))}
            <strong aria-current="page">{event.title}</strong>
            <NetStyles.MembershipActions>
              <NetStyles.TextBtn type="button" onClick={onOpenParentModal} aria-label="상위 사건 변경">
                변경
              </NetStyles.TextBtn>
              <NetStyles.TextBtn type="button" onClick={onReleaseParent} aria-label="상위 사건에서 빼기">
                상위에서 빼기
              </NetStyles.TextBtn>
              {!hasReason && !reasonEditing && (
                <NetStyles.TextBtn
                  type="button"
                  onClick={() => setReasonEditing(true)}
                  aria-label={`'${parentEvent.title}'과 이어진 사유 적기`}
                >
                  사유
                </NetStyles.TextBtn>
              )}
              {extraParents.length === 0 && (
                <NetStyles.TextBtn
                  type="button"
                  ref={extrasAddRef}
                  onClick={onOpenExtrasModal}
                  title="이 사건이 함께 속한 다른 큰 사건"
                >
                  추가 상위
                </NetStyles.TextBtn>
              )}
            </NetStyles.MembershipActions>
          </>
        ) : (
          <NetStyles.AddBtn type="button" onClick={onOpenParentModal}>
            <FiPlus /> 상위 사건 지정
          </NetStyles.AddBtn>
        )}
      </NetStyles.MembershipRow>
      {outsideBy > 0 && parentStartYear != null && (
        <NetStyles.WarnNote role="note">
          이 사건({formatYearLabel(selfYear ?? 0)})이 상위 기간(
          {formatYearLabel(parentStartYear)}
          {parentEndYear != null && parentEndYear !== parentStartYear ? `–${formatYearLabel(parentEndYear)}` : ''}) 밖에
          {' '}{outsideBy}년 떨어져 있습니다 — 날짜 오타이거나 상위를 잘못 고른 것일 수 있습니다{' '}
          <NetStyles.TextBtn
            type="button"
            onClick={onOpenParentModal}
            aria-label="기간 불일치 상위 사건 변경"
          >
            상위 사건 변경
          </NetStyles.TextBtn>
        </NetStyles.WarnNote>
      )}
      {/* 유령 상위 표지 — 주 상위가 해제·삭제됐는데 추가 상위만 남은 상태의 유일 안내. */}
      {!parentEvent && extraParents.length > 0 && (
        <NetStyles.HelperNote>
          주 상위가 해제·삭제됨 — 추가 상위 {extraParents.length}개 유지 중
        </NetStyles.HelperNote>
      )}
      {parentEvent && parentChapters.length > 0 && (
        <NetStyles.MembershipMeta>
          <span>
            {chapterName(currentChapterId)}
            {reach.to != null && reach.from != null && reach.to > reach.from ? ` → ${phaseReachLabel(reach)}에 걸침` : ''}
            {manualChapter ? ' · 직접 지정' : ' · 날짜로 자동'}
          </span>
          <NetStyles.TextBtn type="button" onClick={() => setChapterPickerOpen(true)} aria-label="국면 바꾸기">
            바꾸기
          </NetStyles.TextBtn>
          <SelectModal
            isOpen={chapterPickerOpen}
            onClose={() => setChapterPickerOpen(false)}
            title={`'${parentEvent.title}'의 어느 국면인가`}
            selectedValue={manualChapter ?? '__auto'}
            options={[
              {
                value: '__auto',
                label: '날짜로 자동',
                description: `시작일로 정합니다 — 지금은 ${chapterName(autoChapter)}`,
              },
              ...parentChapters.map((chapter, position) => ({
                value: chapter.id,
                label: `${position + 1}국면 · ${chapter.title}`,
                description: phaseRangeLabel(chapter) || undefined,
              })),
            ]}
            onSelect={(value) => {
              setChapterPickerOpen(false)
              onPatch({ phaseId: value === '__auto' ? null : value } as UpdateEventDto, { savedLabel: '국면' })
            }}
          />
        </NetStyles.MembershipMeta>
      )}
      {/* 주 상위 연결 사유 — 적어 둔 것이 있거나 '사유'를 눌렀을 때만 */}
      {parentEvent && (hasReason || reasonEditing) && (
        <NetStyles.ReasonLine
          onBlur={(blurEvent) => {
            const next = blurEvent.relatedTarget as Node | null
            if (next && blurEvent.currentTarget.contains(next)) return
            setReasonEditing(false)
          }}
        >
          <NetStyles.ReasonKicker>연결 사유</NetStyles.ReasonKicker>
          <InlineText
            value={event.parentLinkReason ?? ''}
            onSave={(next) => saveParentReason(parentEvent.id, next)}
            placeholder={REASON_PLACEHOLDER}
            label={`'${parentEvent.title}' 연결 사유`}
            multiline
            maxLength={REASON_MAX}
            showCount
            style={{ flex: 1 }}
            autoEdit={!hasReason}
          />
        </NetStyles.ReasonLine>
      )}
      {/* 추가 상위 — 주 상위 외 다중 상위(EventParentLink). 트리·breadcrumb·형제는
          주 상위 기준이고, 이 칩 행이 다중 소속 발견성의 정본 지면. 편집(추가·해제·
          승격)은 자식인 이 사건 쪽에서만. */}
      {extraParents.length > 0 && (
      <NetStyles.ExtraParentsRow>
        <NetStyles.BlockLabel id="network-extra-parents-label">
          추가 상위
        </NetStyles.BlockLabel>
        {extraParents.map((extra) => (
          <NetStyles.ExtraChip key={extra.id}>
            <NetStyles.ExtraChipLink
              to={pathKeys.events.detail(extra.id)}
              viewTransition
              onMouseEnter={() => prefetchEvent(extra.id)}
              onFocus={() => prefetchEvent(extra.id)}
              aria-describedby={
                extra.reason ? `extra-reason-${extra.id}` : undefined
              }
              $pending={!extra.title}
            >
              {extra.title || '(제목 동기화 중)'}
            </NetStyles.ExtraChipLink>
            {extra.reason && (
              <NetStyles.VisuallyHidden id={`extra-reason-${extra.id}`}>
                연결 사유: {extra.reason}
              </NetStyles.VisuallyHidden>
            )}
            <NetStyles.ReasonToggleBtn
              type="button"
              onClick={() =>
                setOpenExtraReasonId((cur) =>
                  cur === extra.id ? null : extra.id,
                )
              }
              aria-expanded={openExtraReasonId === extra.id}
              aria-controls={
                openExtraReasonId === extra.id
                  ? 'network-extra-reason-editor'
                  : undefined
              }
              aria-label={`추가 상위 '${extra.title}' 연결 사유 ${
                extra.reason ? '편집' : '추가'
              }`}
              $hasReason={Boolean(extra.reason)}
              title={extra.reason ?? undefined}
            >
              사유{extra.reason ? '•' : ''}
            </NetStyles.ReasonToggleBtn>
            <NetStyles.TextBtn
              type="button"
              onClick={() => onPromoteExtraParent(extra.id)}
              aria-label={`'${extra.title}'을(를) 대표 상위로 승격`}
              disabled={!parentEvent}
              title={!parentEvent ? '주 상위가 없어 승격 대신 상위 지정을 사용하세요' : undefined}
            >
              승격
            </NetStyles.TextBtn>
            <NetStyles.ChipX
              type="button"
              ref={(node) => {
                if (node) extraRemoveRefs.current.set(extra.id, node)
                else extraRemoveRefs.current.delete(extra.id)
              }}
              onClick={() => onRemoveExtraParent(extra.id)}
              aria-label={`추가 상위 '${extra.title}' 해제`}
            >
              <FiX />
            </NetStyles.ChipX>
          </NetStyles.ExtraChip>
        ))}
        <NetStyles.AddBtn
          type="button"
          ref={extrasAddRef}
          onClick={onOpenExtrasModal}
          disabled={!parentEvent}
          aria-describedby={
            !parentEvent ? 'network-extra-parents-helper' : undefined
          }
        >
          <FiPlus /> 추가
        </NetStyles.AddBtn>
        {!parentEvent && (
          <NetStyles.HelperNote id="network-extra-parents-helper">
            먼저 상위 사건을 지정하세요
          </NetStyles.HelperNote>
        )}
      </NetStyles.ExtraParentsRow>
      )}
      {/* 추가 상위 연결 사유 편집 라인 — 열린 칩 하나만. 칩 행 밀도를 지키려 별도 라인. */}
      {openExtraReasonId &&
        (() => {
          const openExtra = extraParents.find(
            (extra) => extra.id === openExtraReasonId,
          )
          if (!openExtra) return null
          return (
            <NetStyles.ReasonLine id="network-extra-reason-editor">
              <NetStyles.ReasonKicker>{openExtra.title} · 사유</NetStyles.ReasonKicker>
              <InlineText
                key={openExtra.id}
                value={openExtra.reason ?? ''}
                onSave={(next) => saveParentReason(openExtra.id, next)}
                placeholder={REASON_PLACEHOLDER}
                label={`'${openExtra.title}' 연결 사유`}
                multiline
                maxLength={REASON_MAX}
                showCount
                style={{ flex: 1 }}
              />
            </NetStyles.ReasonLine>
          )
        })()}
      {/* 이전/다음 — 한 줄 두 칸(예전 카드 2장은 휴대폰에서 세로로 쌓여 130px) */}
      {parentEvent && (prevSibling || nextSibling) && (
        <NetStyles.SiblingStrip aria-label="같은 상위의 이전·다음 사건">
          {prevSibling ? (
            <NetStyles.SiblingStripLink
              to={pathKeys.events.detail(prevSibling.id)}
              viewTransition
              onMouseEnter={() => prefetchEvent(prevSibling.id)}
              onFocus={() => prefetchEvent(prevSibling.id)}
              aria-label={`이전 형제 사건: ${prevSibling.title}`}
              title={prevSibling.title}
            >
              <FiChevronLeft aria-hidden />
              <span>{prevSibling.title}</span>
            </NetStyles.SiblingStripLink>
          ) : (
            <span aria-hidden />
          )}
          {nextSibling && (
            <NetStyles.SiblingStripLink
              to={pathKeys.events.detail(nextSibling.id)}
              viewTransition
              onMouseEnter={() => prefetchEvent(nextSibling.id)}
              onFocus={() => prefetchEvent(nextSibling.id)}
              aria-label={`다음 형제 사건: ${nextSibling.title}`}
              title={nextSibling.title}
              $alignEnd
            >
              <span>{nextSibling.title}</span>
              <FiChevronRight aria-hidden />
            </NetStyles.SiblingStripLink>
          )}
        </NetStyles.SiblingStrip>
      )}
    </NetStyles.MembershipBar>
  )
}
