/**
 * 자동 저장 patch에 1단계 undo를 얹는 훅.
 *
 * - 모든 patch 직전 *현재 event* 값을 inverse patch로 직렬화한다.
 * - mutate 성공 후 5초 토스트 — "되돌리기" 버튼 클릭 시 inverse patch로 mutate.
 * - 한 번에 1개의 토스트만 유효 — 다음 patch 발생 시 이전 토스트는 자동 dismiss
 *   (옛날 상태로의 점프를 방지).
 * - undo 자체는 연쇄 토스트를 띄우지 않음(원본 inverse는 raw `mutate`로 보냄).
 */
import { useCallback, useRef } from 'react'

import { toast } from 'react-hot-toast'
import styled from 'styled-components'

import { type UpdateEventDto } from '@/shared/api/events'

import { type EventDetail } from './use-event-detail'

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

  return useCallback(
    (patch: UpdateEventDto) => {
      if (!event) {
        mutate(patch)
        return
      }

      const inverse = buildInverse(event, patch)

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
              <Pill>
                <Label>저장됨</Label>
                <UndoBtn
                  type="button"
                  onClick={() => {
                    mutate(inverse)
                    toast.dismiss(t.id)
                    lastToastRef.current = null
                  }}
                >
                  되돌리기
                </UndoBtn>
              </Pill>
            ),
            { duration: 5000, position: 'bottom-center' },
          )
          lastToastRef.current = id
        },
      })
    },
    [event, mutate],
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

const Pill = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 14px;
  padding: 4px 4px 4px 14px;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.primary};
`

const Label = styled.span`
  color: ${({ theme }) => theme.colors.text.secondary};
`

const UndoBtn = styled.button`
  font: inherit;
  font-weight: 600;
  background: transparent;
  border: 0;
  padding: 4px 10px;
  margin: 0;
  cursor: pointer;
  border-radius: 6px;
  color: ${({ theme }) => theme.colors.primary ?? '#1e40af'};
  text-decoration: underline;
  text-underline-offset: 3px;

  &:hover {
    text-decoration: none;
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'};
  }
`
