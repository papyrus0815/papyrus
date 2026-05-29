/**
 * 자동 저장 patch에 1단계 undo를 얹는 훅.
 *
 * - 모든 patch 직전 *현재 event* 값을 inverse patch로 직렬화한다.
 * - mutate 성공 후 5초 토스트 — "되돌리기" 버튼 클릭 시 inverse patch로 mutate.
 * - 한 번에 1개의 토스트만 유효 — 다음 patch 발생 시 이전 토스트는 자동 dismiss
 *   (옛날 상태로의 점프를 방지).
 * - undo 자체는 연쇄 토스트를 띄우지 않음(원본 inverse는 raw `mutate`로 보냄).
 */
import { useCallback, useEffect, useRef } from 'react'

import { toast } from 'react-hot-toast'
import { FiCheck, FiCornerUpLeft } from 'react-icons/fi'
import styled, { keyframes } from 'styled-components'

import {
  ledgerAccent,
  ledgerHairlineStrong,
} from '@/pages/events/ledger/styles/ledger-tokens'
import { type UpdateEventDto } from '@/shared/api/events'

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

export function useUndoablePatch({
  event,
  mutate,
}: UseUndoablePatchArgs): (patch: UpdateEventDto) => void {
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

  return useCallback(
    (patch: UpdateEventDto) => {
      const current = eventRef.current
      if (!current) {
        mutate(patch)
        return
      }

      const inverse = buildInverse(current, patch)

      if (lastToastRef.current) {
        toast.dismiss(lastToastRef.current)
        lastToastRef.current = null
      }

      const mySeq = ++seqRef.current

      mutate(patch, {
        onSuccess: () => {
          // 더 새로운 mutation이 시작됐다면 이 콜백은 stale — 토스트 생략.
          if (mySeq !== seqRef.current) return
          const id = toast(
            (t) => (
              <Bar>
                <Row>
                  <Status>
                    <FiCheck aria-hidden />
                    저장됨
                  </Status>
                  <Divider aria-hidden />
                  <UndoBtn
                    type="button"
                    onClick={() => {
                      mutate(inverse)
                      toast.dismiss(t.id)
                      lastToastRef.current = null
                    }}
                  >
                    <FiCornerUpLeft aria-hidden />
                    되돌리기
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
    [mutate],
  )
}

/**
 * patch가 건드린 키만 골라 *현재 event* 값을 같은 DTO 모양으로 직렬화한다.
 * EventDetail의 derived field(`relatedCountries` 등)는 patch dto의 id 배열로 변환.
 */
function buildInverse(
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
      case 'belligerents':
      case 'casualties':
      case 'militaryDetails': {
        const prev = (event as unknown as Record<string, unknown>)[k as string]
        inv[k as string] = prev ?? null
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
