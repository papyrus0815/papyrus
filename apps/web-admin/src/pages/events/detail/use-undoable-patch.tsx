/**
 * 자동 저장 patch에 1단계 undo를 얹는 훅.
 *
 * - 모든 patch 직전 *현재 event* 값을 inverse patch로 직렬화한다.
 * - mutate 성공 후 5초 토스트 — "되돌리기" 버튼 클릭 또는 Ctrl/⌘+Z로 inverse patch를 mutate
 *   (키보드 언두는 텍스트 편집 필드 밖에서만 — 편집 중엔 네이티브 텍스트 언두를 양보).
 * - 한 번에 1개의 토스트만 유효 — 다음 patch 발생 시 이전 토스트는 자동 dismiss
 *   (옛날 상태로의 점프를 방지).
 * - undo 자체는 연쇄 토스트를 띄우지 않음(원본 inverse는 raw `mutate`로 보냄).
 */
import { useCallback, useEffect, useRef } from 'react'

import { FiCheck, FiCornerUpLeft } from 'react-icons/fi'
import styled, { keyframes } from 'styled-components'

import {
  ledgerAccent,
  ledgerHairlineStrong,
} from '@/pages/events/ledger/styles/ledger-tokens'
import { type UpdateEventDto } from '@/shared/api/events'
import { notify } from '@/shared/ui/toast'

import { type EventDetail } from './use-event-detail'

/** "되돌리기" 노출 시간(ms) — 토스트 duration과 소진 타이머 애니메이션이 공유. */
const UNDO_DURATION_MS = 5000

type Mutate = (
  patch: UpdateEventDto,
  options?: {
    onSuccess?: () => void
    onError?: (e: unknown) => void
  },
) => void

interface UseUndoablePatchArgs {
  event: EventDetail | undefined
  mutate: Mutate
}

/** onPatch 호출 시 그 patch에 한해 저장 토스트 문구를 바꾸기 위한 옵션. */
export interface PatchOptions {
  /** 저장 토스트의 상태 문구(기본 "저장됨"). 예: "행위자에 추가 · 나폴레옹 3세". */
  savedLabel?: string
}

export function useUndoablePatch({
  event,
  mutate,
}: UseUndoablePatchArgs): (patch: UpdateEventDto, opts?: PatchOptions) => void {
  const lastToastRef = useRef<string | null>(null)
  /**
   * 빠른 연속 patch 시 onSuccess 콜백이 도착하는 순서가 mutate 호출 순서와
   * 다를 수 있다. 매 mutate마다 seq를 증가시키고, 콜백 안에서 *자기 seq가
   * 최신인지* 검증해 stale 콜백의 토스트가 최신 inverse를 덮어쓰지 않도록.
   */
  const seqRef = useRef(0)
  /**
   * `event`를 ref로 잡아 mutate 직전 *그 시점의 최신* 스냅샷에서 inverse를 만든다.
   *
   * 과거엔 콜백이 클로저로 잡은 `event`를 사용해, 빠른 연속 patch에서 두 번째
   * patch의 inverse가 *첫 patch 이전 상태*를 가리키는 문제가 있었음
   * (react-query refetch가 두 mutate 사이에 완료되지 못해 클로저가 stale).
   * 결과적으로 "되돌리기" 한 번이 두 patch를 동시에 되돌리는 모양이 됨.
   */
  const eventRef = useRef<EventDetail | undefined>(event)
  useEffect(() => {
    eventRef.current = event
  }, [event])

  /**
   * 키보드 언두(Ctrl/Cmd+Z) — 5초 토스트 버튼은 키보드로 도달하기 어렵다(포커스 이동
   * 없음·bottom-center·자동 소멸). 보편적 언두 단축키를 배선해, 지금 유효한 inverse가
   * 있으면 편집 필드 밖에서 Ctrl+Z로 즉시 되돌린다. mutate는 매 렌더 stable하지 않을 수
   * 있어 ref로 고정하고, 리스너는 마운트 시 1회만 바인딩한다.
   */
  const mutateRef = useRef(mutate)
  useEffect(() => {
    mutateRef.current = mutate
  }, [mutate])
  const pendingUndoRef = useRef<UpdateEventDto | null>(null)
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearPendingUndo = useCallback(() => {
    pendingUndoRef.current = null
    if (clearTimerRef.current) {
      clearTimeout(clearTimerRef.current)
      clearTimerRef.current = null
    }
  }, [])

  const runUndo = useCallback(() => {
    const inverse = pendingUndoRef.current
    if (!inverse) return
    mutateRef.current(inverse)
    if (lastToastRef.current) {
      notify.dismiss(lastToastRef.current)
      lastToastRef.current = null
    }
    clearPendingUndo()
  }, [clearPendingUndo])

  useEffect(() => {
    const handleKeyDown = (keyEvent: KeyboardEvent) => {
      const isUndoCombo =
        (keyEvent.metaKey || keyEvent.ctrlKey) &&
        !keyEvent.shiftKey &&
        !keyEvent.altKey &&
        (keyEvent.key === 'z' || keyEvent.key === 'Z')
      if (!isUndoCombo || !pendingUndoRef.current) return
      // 텍스트 편집 중(입력/textarea/contentEditable)엔 네이티브 텍스트 언두를 가로채지 않는다.
      if (isEditableTarget(keyEvent.target) || isEditableTarget(document.activeElement)) {
        return
      }
      keyEvent.preventDefault()
      runUndo()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [runUndo])

  return useCallback(
    (patch: UpdateEventDto, opts?: PatchOptions) => {
      const current = eventRef.current
      if (!current) {
        mutate(patch)
        return
      }

      const savedLabel = opts?.savedLabel ?? '저장됨'

      const inverse = buildInverse(current, patch)

      if (lastToastRef.current) {
        notify.dismiss(lastToastRef.current)
        lastToastRef.current = null
      }
      // 새 patch가 나가는 순간 직전 inverse는 무효 — in-flight 창(onSuccess 도착 전)에
      // Ctrl+Z가 stale inverse를 발사하는 구멍 봉합. 이 patch의 inverse는 onSuccess에서
      // 재등록되므로 정상 흐름엔 영향 없음.
      clearPendingUndo()

      const mySeq = ++seqRef.current

      mutate(patch, {
        onSuccess: () => {
          // 더 새로운 mutation이 시작됐다면 이 콜백은 stale — 토스트 생략.
          if (mySeq !== seqRef.current) return
          // 키보드 언두가 참조할 현재 inverse를 등록 — 토스트 가시 수명(5초)에 맞춰 만료.
          pendingUndoRef.current = inverse
          if (clearTimerRef.current) clearTimeout(clearTimerRef.current)
          clearTimerRef.current = setTimeout(() => {
            pendingUndoRef.current = null
            clearTimerRef.current = null
          }, UNDO_DURATION_MS)
          const id = notify.show(
            () => (
              <Bar>
                <Row>
                  <Status>
                    <FiCheck aria-hidden />
                    {savedLabel}
                  </Status>
                  <Divider aria-hidden />
                  <UndoBtn type="button" onClick={runUndo}>
                    <FiCornerUpLeft aria-hidden />
                    되돌리기
                    <Kbd aria-hidden>{UNDO_SHORTCUT_HINT}</Kbd>
                  </UndoBtn>
                </Row>
                {/* 5초 소진 타이머 — undo 기회가 닫히는 시점을 시각화. */}
                <Track aria-hidden>
                  <Fill />
                </Track>
              </Bar>
            ),
            { duration: UNDO_DURATION_MS, position: 'bottom-center' },
          )
          lastToastRef.current = id
        },
      })
    },
    [mutate, runUndo, clearPendingUndo],
  )
}

/** 언두 단축키 힌트 — 플랫폼별 표기(⌘Z / Ctrl+Z). */
const IS_APPLE_PLATFORM =
  typeof navigator !== 'undefined' &&
  /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent || '')
const UNDO_SHORTCUT_HINT = IS_APPLE_PLATFORM ? '⌘Z' : 'Ctrl+Z'

/** 포커스가 텍스트 편집 컨텍스트에 있는지 — 그럴 땐 Ctrl+Z를 네이티브 텍스트 언두에 양보. */
function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    target.isContentEditable ||
    target.getAttribute('role') === 'textbox'
  )
}

/**
 * patch가 건드린 키만 골라 *현재 event* 값을 같은 DTO 모양으로 직렬화한다.
 * EventDetail의 derived field(`relatedCountries` 등)는 patch dto의 id 배열로 변환.
 */
export function buildInverse(
  event: EventDetail,
  patch: UpdateEventDto,
): UpdateEventDto {
  const inv: Record<string, unknown> = {}
  const keys = Object.keys(patch) as Array<keyof UpdateEventDto>

  for (const k of keys) {
    switch (k) {
      case 'keywords':
        inv.keywords = event.keywords ?? []
        break
      case 'eventSections':
        inv.eventSections = (event.eventSections ?? []).map((s) => ({
          title: s.title,
          content: s.content,
          order: s.order,
          sectionType: s.sectionType,
        }))
        break
      case 'eventImages':
        inv.eventImages = (event.eventImages ?? []).map((i) => ({
          imageUrl: i.imageUrl,
          caption: i.caption,
          source: i.source,
          order: i.order,
          isPrimary: i.isPrimary,
        }))
        break
      case 'relatedPersons':
        inv.relatedPersons = (event.relatedPersons ?? []).map((p) => ({
          personId: p.personId,
          role: p.role ?? undefined,
          note: p.note ?? undefined,
        }))
        break
      case 'relatedCountryIds':
        inv.relatedCountryIds = (event.relatedCountries ?? []).map((c) => c.id)
        break
      case 'relatedHistoricalCountryIds':
        inv.relatedHistoricalCountryIds = (
          event.relatedHistoricalCountries ?? []
        ).map((c) => c.id)
        break
      /**
       * 모듈 객체 키 — 원래 값이 null/없음이면 inverse는 `null`을 명시 전송해야
       * 서버가 컬럼을 비울 수 있다(서버는 `=== undefined` 가드라 undefined는 무시).
       * 객체가 있던 상태로 되돌릴 때는 원래 객체 그대로.
       */
      /**
       * 정규화 군사 정보 — 전체 객체를 보낸다. 원래 비어 있었으면(undefined/null)
       * 빈 객체 `{}`를 *명시 전송*해야 서버가 모두 비운다(saveMilitaryData는 truthy일
       * 때만 동작 — null은 무시되어 데이터가 남는다).
       */
      case 'militaryEvent': {
        inv.militaryEvent = (event.militaryEvent ?? {}) as UpdateEventDto['militaryEvent']
        break
      }
      /**
       * nullable 스칼라 — 비어 있던 값으로의 undo는 `undefined`(서버 무시)가 아니라
       * 빈 값을 *명시 전송*해야 컬럼이 비워진다. 텍스트는 ''(빈 문자열), categoryId는
       * FK라 null. (예: 빈 상태 → 값 입력을 undo하면 다시 비워져야 함.)
       */
      case 'description':
      case 'location':
      case 'background':
      case 'aftermath':
      case 'warCost': {
        const prev = (event as unknown as Record<string, unknown>)[k as string]
        inv[k as string] = prev ?? ''
        break
      }
      case 'categoryId':
        inv.categoryId = event.categoryId ?? null
        break
      /**
       * 계층 필드 — 응답엔 childEventIds가 없고 childEvents(객체 배열)뿐이라
       * default 분기로 가면 undefined가 되어 inverse가 빈 patch로 무동작했다.
       * parentEventId도 "부모 없음"으로의 undo는 null 명시 전송이어야 FK가 비워진다.
       */
      case 'childEventIds':
        inv.childEventIds = (event.childEvents ?? []).map((child) => child.id)
        break
      case 'parentEventId':
        inv.parentEventId = event.parentEventId ?? null
        break
      /**
       * 추가 상위 — 응답엔 extraParents(객체 배열)뿐이라 id 배열로 역직렬화.
       * 승격 swap({parentEventId, extraParentEventIds} 동시 patch)은 buildInverse가
       * patch 키 순회 구조라 주·부 양쪽을 한 inverse로 원자 복원한다.
       */
      case 'extraParentEventIds':
        inv.extraParentEventIds = (event.extraParents ?? []).map(
          (extra) => extra.id,
        )
        break
      /**
       * 연결 사유(부분 업서트) — patch가 나열한 쌍만 되돌린다. 이전 값은 event에서
       * 쌍 위치별로 역직렬화(주 상위=parentLinkReason, 추가 상위=extraParents[].reason,
       * 하위=childEvents/extraChildren[].reason). 이전에 없던 사유의 undo는 null 명시
       * 전송이어야 서버가 행을 삭제한다(케이스 부재 시 undefined 키 → 무성 no-op였음).
       */
      case 'parentLinkReasons':
        inv.parentLinkReasons = (patch.parentLinkReasons ?? []).map(
          (entry) => ({
            parentEventId: entry.parentEventId,
            reason:
              (entry.parentEventId === (event.parentEventId ?? null)
                ? event.parentLinkReason
                : event.extraParents?.find(
                    (extra) => extra.id === entry.parentEventId,
                  )?.reason) ?? null,
          }),
        )
        break
      case 'childLinkReasons':
        inv.childLinkReasons = (patch.childLinkReasons ?? []).map((entry) => ({
          childEventId: entry.childEventId,
          reason:
            (event.childEvents?.find(
              (child) => child.id === entry.childEventId,
            )?.reason ??
              event.extraChildren?.find(
                (child) => child.id === entry.childEventId,
              )?.reason) ??
            null,
        }))
        break
      default:
        // 나머지는 단순 scalar — event에서 같은 키 그대로
        inv[k as string] =
          (event as unknown as Record<string, unknown>)[k as string] ??
          undefined
        break
    }
  }
  return inv as UpdateEventDto
}

/* ───────────────────────── styles ───────────────────────── */

/**
 * 토스트 콘텐츠 루트. 외곽 pill·blur·그림자는 전역 Toaster(app.tsx)가 입히므로
 * 여기선 *콘텐츠만*. 가로 패딩을 따로 두지 않아 컨테이너 패딩과 이중으로 겹치지
 * 않게 한다. 상단 = 상태·액션 행, 하단 = 소진 타이머.
 */
const Bar = styled.span`
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 9px;
  font-size: 13px;
  width: 100%;
`

const Row = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
`

const Status = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};

  svg {
    width: 14px;
    height: 14px;
    flex-shrink: 0;
  }
`

/* 상태(저장됨)와 액션(되돌리기)을 가르는 얇은 세로 hairline. */
const Divider = styled.span`
  width: 1px;
  height: 14px;
  flex-shrink: 0;
  background: ${({ theme }) => ledgerHairlineStrong(theme.mode)};
`

const UndoBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font: inherit;
  font-weight: 700;
  background: transparent;
  border: 0;
  padding: 4px 10px;
  margin: -2px 0;
  cursor: pointer;
  border-radius: 999px;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  transition: background 0.14s;

  svg {
    width: 14px;
    height: 14px;
    flex-shrink: 0;
  }

  &:hover,
  &:focus-visible {
    background: ${({ theme }) =>
      theme.mode === 'dark'
        ? 'rgba(255,255,255,0.08)'
        : 'rgba(15,23,42,0.05)'};
    outline: none;
  }
`

/* 단축키 힌트 — 되돌리기 버튼에 Ctrl/⌘+Z를 옅게 노출(발견성). */
const Kbd = styled.kbd`
  font-family: inherit;
  font-size: 11px;
  font-weight: 600;
  line-height: 1;
  padding: 2px 5px;
  border-radius: 5px;
  color: ${({ theme }) => ledgerAccent(theme.mode)};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.06)'};
`

/* 소진 타이머 트랙 — 콘텐츠 폭 안쪽에 두어 pill 곡률과 충돌하지 않는다. */
const Track = styled.span`
  display: block;
  width: 100%;
  height: 2px;
  border-radius: 999px;
  overflow: hidden;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.07)'};
`

const deplete = keyframes`
  from { transform: scaleX(1); }
  to { transform: scaleX(0); }
`

const Fill = styled.span`
  display: block;
  width: 100%;
  height: 100%;
  transform-origin: left center;
  background: ${({ theme }) => ledgerAccent(theme.mode)};
  opacity: 0.75;
  /* duration은 toast duration과 동일(UNDO_DURATION_MS) — 사라지는 순간 0이 되도록. */
  animation: ${deplete} ${UNDO_DURATION_MS}ms linear forwards;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    opacity: 0.45;
  }
`
