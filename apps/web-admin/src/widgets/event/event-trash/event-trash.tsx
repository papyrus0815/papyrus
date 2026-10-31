/**
 * 사건 휴지통 — 삭제 확인 창·삭제(되돌리기 토스트)·복구를 목록 드로어와 사건 상세가 함께 쓴다.
 *
 * 예전 삭제는 목록 드로어에만 있었고, 확인 창은 "목록에서 복구할 수 없습니다"라고 했다(휴지통이 생긴 뒤에도).
 * 하위가 있는 묶음을 지우면 하위가 전부 최상위로 흩어졌고 복구해도 돌아오지 않았다 — 이제 '하위도 함께'
 * (기본)를 고르면 하위가 상위 연결을 지닌 채 함께 휴지통으로 가고, 복구하면 함께 돌아온다.
 */
import { useState } from 'react'

import { type QueryClient, useQueryClient } from '@tanstack/react-query'
import styled from 'styled-components'

import { personKeys } from '@/entities/person/query-keys'
import { ledgerAccent, ledgerAccentSubtle, RADIUS } from '@/entities/event/ui/ledger-tokens'
import { eventKeys } from '@/shared/api/event-query-keys'
import { deleteEvent, restoreEvent } from '@/shared/api/events'
import { invalidateEventQueries } from '@/shared/api/invalidate-events'
import { Modal } from '@/shared/ui/modal'
import { ModalBody, ModalFooter } from '@/shared/ui/modal/modal.styles'
import { notify } from '@/shared/ui/toast'

/** 휴지통 보관 기간 — 서버 EventService.TRASH_RETENTION_DAYS와 같은 값 */
export const TRASH_RETENTION_DAYS = 30

/** 사건이 박혀 있는 다른 화면들까지 — 지운·되살린 사건이 그대로 남거나 빠지지 않게 */
function refreshEverywhere(queryClient: QueryClient, eventId: string) {
  invalidateEventQueries(queryClient, { eventId })
  void queryClient.invalidateQueries({ queryKey: personKeys.detailFullAll })
  void queryClient.invalidateQueries({ queryKey: eventKeys.byCountryAll() })
}

/**
 * 휴지통에서 되살린다. 상위가 아직 삭제돼 있으면 서버가 최상위로 되살리고, 함께 지운 하위도 함께 돌아온다.
 * @returns 성공 여부
 */
export async function restoreEventFromTrash(
  queryClient: QueryClient,
  target: { id: string; title: string; parentEventId?: string | null },
): Promise<boolean> {
  try {
    const restored = (await restoreEvent(target.id)) as { parentEventId?: string | null; restoredChildCount?: number }
    refreshEverywhere(queryClient, target.id)
    const childNote = restored.restoredChildCount ? ` — 함께 지운 하위 ${restored.restoredChildCount}건도` : ''
    if (target.parentEventId && !restored.parentEventId) {
      notify.info(`'${target.title}'을(를) 복구했습니다${childNote} — 상위 사건이 삭제돼 있어 최상위로 되살렸습니다`)
    } else {
      notify.success(`'${target.title}'을(를) 복구했습니다${childNote}`)
    }
    return true
  } catch {
    notify.error('복구하지 못했습니다')
    return false
  }
}

/**
 * 휴지통으로 — 끝나면 '되돌리기'가 달린 토스트(바로 복구).
 * @returns 성공 여부
 */
export function useDeleteEventToTrash() {
  const queryClient = useQueryClient()
  return async (
    target: { id: string; title: string; parentEventId?: string | null },
    withChildren: boolean,
    onUndo?: () => void,
  ): Promise<boolean> => {
    try {
      await deleteEvent(target.id, { withChildren })
      refreshEverywhere(queryClient, target.id)
      notify.action(`'${target.title}'을(를) 휴지통으로 옮겼습니다`, {
        label: '되돌리기',
        onClick: () => {
          void restoreEventFromTrash(queryClient, target).then((restored) => {
            if (restored) onUndo?.()
          })
        },
      })
      return true
    } catch {
      notify.error('사건을 삭제하지 못했습니다')
      return false
    }
  }
}

/**
 * 삭제 확인 창 — 하위가 있으면 '하위도 함께(기본) / 하위는 남기기'를 고른다.
 * 고른 값을 onConfirm(withChildren)으로 넘긴다.
 */
export function EventDeleteDialog({
  isOpen,
  title,
  childCount,
  busy = false,
  onCancel,
  onConfirm,
}: {
  isOpen: boolean
  title: string
  /** 바로 아래 하위 수 — 0이면 고르기 없이 한 문장 */
  childCount: number
  busy?: boolean
  onCancel: () => void
  onConfirm: (withChildren: boolean) => void
}) {
  const [withChildren, setWithChildren] = useState(true)

  return (
    <Modal isOpen={isOpen} onClose={onCancel} title="사건 삭제" size="narrow">
      <ModalBody>
        <Lead>
          <strong>‘{title}’</strong>을(를) 휴지통으로 옮깁니다. {TRASH_RETENTION_DAYS}일 동안 사건 목록 ⋯ 메뉴의
          ‘삭제한 사건’에서 복구할 수 있고, 그 뒤에는 자동으로 영구 삭제됩니다.
        </Lead>
        {childCount > 0 && (
          <Choices role="radiogroup" aria-label="하위 사건 처리">
            <Choice data-active={withChildren || undefined}>
              <input type="radio" name="delete-children" checked={withChildren} onChange={() => setWithChildren(true)} />
              <ChoiceText>
                <ChoiceTitle>하위 사건 {childCount}건도 함께 휴지통으로</ChoiceTitle>
                <ChoiceHint>그 아래 하위까지 함께 옮겨지고, 복구하면 지금 구조 그대로 돌아옵니다.</ChoiceHint>
              </ChoiceText>
            </Choice>
            <Choice data-active={!withChildren || undefined}>
              <input type="radio" name="delete-children" checked={!withChildren} onChange={() => setWithChildren(false)} />
              <ChoiceText>
                <ChoiceTitle>하위 사건은 남기기</ChoiceTitle>
                <ChoiceHint>
                  하위 {childCount}건은 다른 상위가 있으면 그쪽으로, 없으면 최상위 사건으로 옮겨집니다. 이 사건을
                  복구해도 하위는 돌아오지 않습니다.
                </ChoiceHint>
              </ChoiceText>
            </Choice>
          </Choices>
        )}
      </ModalBody>
      <ModalFooter>
        <Button type="button" onClick={onCancel} disabled={busy}>
          취소
        </Button>
        <Button type="button" $danger onClick={() => onConfirm(childCount > 0 && withChildren)} disabled={busy}>
          {busy ? '옮기는 중…' : '휴지통으로'}
        </Button>
      </ModalFooter>
    </Modal>
  )
}

const Lead = styled.p`
  margin: 0;
  font-size: 14px;
  line-height: 1.65;
  word-break: keep-all;
  color: ${({ theme }) => theme.colors.text.secondary};

  strong {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`

const Choices = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const Choice = styled.label`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 12px;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  cursor: pointer;

  &[data-active] {
    border-color: ${({ theme }) => ledgerAccent(theme.mode)};
    background: ${({ theme }) => ledgerAccentSubtle(theme.mode)};
  }

  input {
    margin-top: 3px;
    accent-color: ${({ theme }) => ledgerAccent(theme.mode)};
  }
`

const ChoiceText = styled.span`
  display: flex;
  flex-direction: column;
  gap: 2px;
`

const ChoiceTitle = styled.span`
  font-size: 13.5px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
`

const ChoiceHint = styled.span`
  font-size: 12.5px;
  line-height: 1.55;
  word-break: keep-all;
  color: ${({ theme }) => theme.colors.text.secondary};
`

const Button = styled.button<{ $danger?: boolean }>`
  padding: 8px 16px;
  border-radius: ${RADIUS.SM};
  border: 1px solid ${({ theme, $danger }) => ($danger ? theme.colors.error : theme.colors.border.light)};
  background: ${({ theme, $danger }) => ($danger ? theme.colors.error : 'transparent')};
  color: ${({ theme, $danger }) => ($danger ? '#fff' : theme.colors.text.primary)};
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;

  &:disabled {
    opacity: 0.6;
    cursor: progress;
  }
`
