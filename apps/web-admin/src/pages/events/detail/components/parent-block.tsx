import { useEffect, useMemo, useState, type RefObject } from 'react'

import { FiChevronLeft, FiChevronRight, FiFlag, FiPlus, FiX } from 'react-icons/fi'
import { useQuery } from '@tanstack/react-query'

import {
  getAnchorBadgeLabel,
  isAnchorEvent,
  isEmptyAnchorEvent,
} from '@/features/event-hierarchy/model/anchor'
import { type UpdateEventDto, getEventsByParentId } from '@/shared/api/events'
import { pathKeys } from '@/shared/router'
import { InlineText } from '@/shared/ui/inline-edit'

import { type EventDetail, usePrefetchEventDetail } from '../use-event-detail'
import { REASON_MAX, compareEventStart } from './detail-network.lib'
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

  /**
   * 앵커 판정 입력 — 상세 응답의 직계 자식으로 최소 hierarchy를 세운다.
   * 불리언 판정은 이것으로 정확하다(직계 ≥ 1 ⟺ 자손 ≥ 1). 수치는 부정확하므로 쓰지 않는다.
   */
  const anchorSubject = useMemo(
    () => ({
      id: event.id,
      parentEventId: event.parentEventId ?? undefined,
      anchorOverride: event.anchorOverride ?? null,
      hierarchy: {
        id: event.id,
        children: (event.childEvents ?? []).map((child) => ({ id: child.id })),
      },
    }),
    [event.id, event.parentEventId, event.anchorOverride, event.childEvents],
  )
  const isAnchor = isAnchorEvent(anchorSubject)
  const isDeclaredAnchor = event.anchorOverride === 'ANCHOR'
  const isEmptyAnchor = isEmptyAnchorEvent(anchorSubject)
  const anchorBadgeLabel = getAnchorBadgeLabel(anchorSubject)

  /**
   * 앵커 지정 patch — 3상 그대로 보낸다(null = 자동 판정 복귀).
   * 토스트 문구에 **대상 이름을 박는다** — 기존 '저장됨' 일괄 문구로는 방금 무엇을
   * 지정했는지 5초 안에 확인할 방법이 없었다(검토 안 C 이식분).
   */
  const setAnchorOverride = (next: 'ANCHOR' | 'PLAIN' | null) => {
    const savedLabel =
      next === 'ANCHOR'
        ? `'${event.title}'을(를) 최상위 사건으로 지정`
        : next === 'PLAIN'
          ? `'${event.title}'을(를) 최상위 목록에서 제외`
          : `'${event.title}' 최상위 지정 해제 · 자동 판정`
    onPatch({ anchorOverride: next } as UpdateEventDto, { savedLabel })
  }

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
    queryKey: ['events', 'siblings', event.parentEventId],
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

  return (
    <NetStyles.HierBlock role="group" aria-labelledby="network-parent-label">
      <NetStyles.BlockLabel id="network-parent-label">상위 사건</NetStyles.BlockLabel>
      {/* $reveal — 편집 크롬(변경·해제 TextBtn)만 hover/focus-within 시 노출.
          빈 상태의 AddBtn(상위 사건 지정)은 셀렉터 밖이라 상시 노출(어포던스 유지). */}
      <NetStyles.HierRow $reveal>
        {parentEvent ? (
          <>
            <NetStyles.ParentLink
              to={pathKeys.events.detail(parentEvent.id)}
              viewTransition
              onMouseEnter={() => prefetchEvent(parentEvent.id)}
            >
              {parentEvent.title}
            </NetStyles.ParentLink>
            <NetStyles.TextBtn
              type="button"
              onClick={onOpenParentModal}
              aria-label="상위 사건 변경"
            >
              변경
            </NetStyles.TextBtn>
            <NetStyles.TextBtn
              type="button"
              onClick={onReleaseParent}
              aria-label="상위 사건 해제"
            >
              해제
            </NetStyles.TextBtn>
          </>
        ) : (
          <NetStyles.AddBtn type="button" onClick={onOpenParentModal}>
            <FiPlus /> 상위 사건 지정
          </NetStyles.AddBtn>
        )}
      </NetStyles.HierRow>
      {/**
       * ── 최상위(앵커) 사건 지정 ────────────────────────────────────────────
       *
       * 긍정형·상시 노출. 기존 계층 크롬은 hover에서만 뜨는 부정형 '해제' 하나뿐이라
       * '이 사건이 최상위다'라는 상태를 화면이 한 번도 말하지 않았다(검토 근인 1).
       *
       * 판정은 `isAnchorEvent` 단일출처. 상세 응답은 직계 자식까지만 싣지만
       * **불리언 판정은 정확하다** — 직계 자식 ≥ 1 ⟺ 자손 ≥ 1이기 때문. 반면 *수치*는
       * 손자를 못 세므로 이 행에는 개수를 찍지 않는다(지면마다 다른 수를 말하던 근인 4).
       */}
      <NetStyles.HierRow $reveal>
        {isAnchor ? (
          <>
            <NetStyles.AnchorBadge $declared={isDeclaredAnchor}>
              <FiFlag aria-hidden />
              {anchorBadgeLabel}
              {isDeclaredAnchor && ' (직접 지정)'}
            </NetStyles.AnchorBadge>
            {isDeclaredAnchor ? (
              <NetStyles.TextBtn
                type="button"
                onClick={() => setAnchorOverride(null)}
                aria-label="최상위 사건 지정 해제 — 하위 유무로 자동 판정"
              >
                지정 해제
              </NetStyles.TextBtn>
            ) : (
              /* 자손이 있어 자동으로 앵커가 된 사건 — 잡음이면 손으로 뺄 수 있어야 한다. */
              <NetStyles.TextBtn
                type="button"
                onClick={() => setAnchorOverride('PLAIN')}
                aria-label="이 사건을 최상위 사건 목록에서 제외"
              >
                목록에서 제외
              </NetStyles.TextBtn>
            )}
          </>
        ) : (
          <NetStyles.AddBtn
            type="button"
            onClick={() => setAnchorOverride('ANCHOR')}
          >
            <FiFlag /> 최상위 사건으로 지정
          </NetStyles.AddBtn>
        )}
        {/* PLAIN으로 눌러 둔 상태는 되돌릴 길이 보여야 한다 — 아니면 막다른 길이 된다. */}
        {event.anchorOverride === 'PLAIN' && (
          <NetStyles.TextBtn
            type="button"
            onClick={() => setAnchorOverride(null)}
            aria-label="최상위 사건 자동 판정으로 되돌리기"
          >
            자동 판정으로
          </NetStyles.TextBtn>
        )}
      </NetStyles.HierRow>
      {/**
       * 빈 앵커 위생 — 지정만 해 두고 하위를 영영 안 붙이면 유령 앵커가 쌓인다.
       * 정보만 주고 끝내지 않고 하위를 붙일 경로를 바로 옆에 붙인다.
       */}
      {isEmptyAnchor && (
        <NetStyles.HelperNote>
          아직 하위 사건이 없습니다 — 아래 &lsquo;하위 사건&rsquo;에서 모아 보세요
        </NetStyles.HelperNote>
      )}
      {/* 유령 상위 표지 — 주 상위가 해제·삭제됐는데 추가 상위만 남은 상태의 유일 안내. */}
      {!parentEvent && extraParents.length > 0 && (
        <NetStyles.HelperNote>
          주 상위가 해제·삭제됨 — 추가 상위 {extraParents.length}개 유지 중
        </NetStyles.HelperNote>
      )}
      {/* 주 상위 연결 사유 — '왜 이 사건이 대표 상위와 이어지는가'. 주/부가 사용자에겐
          한 개념이라 대표 관계에도 사유를 적을 수 있게(비대칭 해소). */}
      {parentEvent && (
        <NetStyles.ReasonLine>
          <NetStyles.ReasonKicker>연결 사유</NetStyles.ReasonKicker>
          <InlineText
            value={event.parentLinkReason ?? ''}
            onSave={(next) => saveParentReason(parentEvent.id, next)}
            placeholder="연결 사유 추가"
            label={`'${parentEvent.title}' 연결 사유`}
            multiline
            maxLength={REASON_MAX}
            showCount
            style={{ flex: 1 }}
          />
        </NetStyles.ReasonLine>
      )}
      {/* 추가 상위 — 주 상위 외 다중 상위(EventParentLink). 트리·breadcrumb·형제는
          주 상위 기준이고, 이 칩 행이 다중 소속 발견성의 정본 지면. 편집(추가·해제·
          승격)은 자식인 이 사건 쪽에서만. */}
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
      {parentEvent && (prevSibling || nextSibling) && (
        <NetStyles.SiblingNav aria-label="형제 사건 이동">
          {prevSibling ? (
            <NetStyles.SiblingLink
              to={pathKeys.events.detail(prevSibling.id)}
              viewTransition
              onMouseEnter={() => prefetchEvent(prevSibling.id)}
              onFocus={() => prefetchEvent(prevSibling.id)}
              aria-label={`이전 형제 사건: ${prevSibling.title}`}
            >
              <FiChevronLeft aria-hidden />
              <NetStyles.SiblingText>{prevSibling.title}</NetStyles.SiblingText>
            </NetStyles.SiblingLink>
          ) : (
            <span />
          )}
          {nextSibling && (
            <NetStyles.SiblingLink
              to={pathKeys.events.detail(nextSibling.id)}
              viewTransition
              onMouseEnter={() => prefetchEvent(nextSibling.id)}
              onFocus={() => prefetchEvent(nextSibling.id)}
              aria-label={`다음 형제 사건: ${nextSibling.title}`}
              $alignEnd
            >
              <NetStyles.SiblingText>{nextSibling.title}</NetStyles.SiblingText>
              <FiChevronRight aria-hidden />
            </NetStyles.SiblingLink>
          )}
        </NetStyles.SiblingNav>
      )}
    </NetStyles.HierBlock>
  )
}
