/**
 * 삭제한 사건(휴지통) — 복구·영구 삭제.
 *
 * 서버엔 삭제 목록·복구·영구 삭제 API와 웹 래퍼가 다 있었는데 부르는 화면이 0곳이라,
 * 지운 사건은 DB에만 남고 되살릴 방법이 없었다(점검 당시 49건).
 *
 * - 복구: 상위 사건이 아직 삭제돼 있으면 서버가 이 사건을 최상위로 되살린다(어느 목록에도
 *   안 나오는 고아 방지). 그 경우 그렇게 됐다고 알린다.
 * - 영구 삭제: 되돌릴 수 없으므로 확인을 받는다.
 * 무효화는 공용 헬퍼 — 휴지통 목록도 `eventKeys.lists()` 아래라 함께 다시 받는다.
 */
import { useState } from 'react'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { FiRotateCcw, FiTrash2 } from 'react-icons/fi'
import styled from 'styled-components'

import { eventKeys } from '@/shared/api/event-query-keys'
import {
  type EventResponseDto,
  getDeletedEvents,
  permanentlyDeleteEvent,
  restoreEvent,
} from '@/shared/api/events'
import { invalidateEventQueries } from '@/shared/api/invalidate-events'
import { eventDateLabel } from '@/shared/lib/event-date-label'
import { confirm } from '@/shared/ui/confirm-dialog'
import { Modal } from '@/shared/ui/modal'
import { notify } from '@/shared/ui/toast'

interface DeletedEventsModalProps {
  isOpen: boolean
  onClose: () => void
}

/** 삭제 시각 — 며칠 전인지가 먼저 읽히도록 날짜만 */
function formatDeletedAt(value?: string | null): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return `${date.getFullYear()}. ${date.getMonth() + 1}. ${date.getDate()}. 삭제`
}

export function DeletedEventsModal({ isOpen, onClose }: DeletedEventsModalProps) {
  const queryClient = useQueryClient()
  /** 처리 중인 행 — 같은 행을 두 번 누르지 못하게, 다른 행은 계속 쓸 수 있게 */
  const [pendingId, setPendingId] = useState<string | null>(null)

  const {
    data: deletedEvents = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: eventKeys.deleted(),
    queryFn: getDeletedEvents,
    enabled: isOpen,
  })

  const handleRestore = async (event: EventResponseDto) => {
    setPendingId(event.id)
    try {
      const restored = await restoreEvent(event.id)
      invalidateEventQueries(queryClient, { eventId: event.id })
      if (event.parentEventId && !restored.parentEventId) {
        notify.info(`'${event.title}'을(를) 복구했습니다 — 상위 사건이 삭제돼 있어 최상위로 되살렸습니다`)
      } else {
        notify.success(`'${event.title}'을(를) 복구했습니다`)
      }
    } catch {
      notify.error('복구하지 못했습니다')
    } finally {
      setPendingId(null)
    }
  }

  const handlePermanentDelete = async (event: EventResponseDto) => {
    const ok = await confirm({
      title: '영구 삭제',
      message: `'${event.title}'을(를) 영구 삭제할까요? 되돌릴 수 없습니다.`,
      confirmLabel: '영구 삭제',
      danger: true,
    })
    if (!ok) return
    setPendingId(event.id)
    try {
      await permanentlyDeleteEvent(event.id)
      invalidateEventQueries(queryClient, { eventId: event.id })
      notify.success(`'${event.title}'을(를) 영구 삭제했습니다`)
    } catch {
      notify.error('영구 삭제하지 못했습니다')
    } finally {
      setPendingId(null)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="삭제한 사건"
      subtitle={
        deletedEvents.length > 0
          ? `${deletedEvents.length}건 — 복구하면 목록에 다시 나타납니다`
          : undefined
      }
      size="narrow"
    >
      <List>
        {isLoading ? (
          <Empty>불러오는 중…</Empty>
        ) : isError ? (
          <Empty>삭제한 사건을 불러오지 못했습니다.</Empty>
        ) : deletedEvents.length === 0 ? (
          <Empty>삭제한 사건이 없습니다.</Empty>
        ) : (
          deletedEvents.map((event) => {
            const meta = [
              eventDateLabel(event),
              formatDeletedAt(event.deletedAt),
            ]
              .filter(Boolean)
              .join(' · ')
            const busy = pendingId === event.id
            return (
              <Row key={event.id} aria-busy={busy}>
                <RowText>
                  <RowTitle>{event.title}</RowTitle>
                  {meta && <RowMeta>{meta}</RowMeta>}
                </RowText>
                <RowActions>
                  <ActionBtn
                    type="button"
                    disabled={busy}
                    onClick={() => void handleRestore(event)}
                    aria-label={`'${event.title}' 복구`}
                  >
                    <FiRotateCcw size={13} aria-hidden="true" />
                    복구
                  </ActionBtn>
                  <ActionBtn
                    type="button"
                    $danger
                    disabled={busy}
                    onClick={() => void handlePermanentDelete(event)}
                    aria-label={`'${event.title}' 영구 삭제`}
                  >
                    <FiTrash2 size={13} aria-hidden="true" />
                  </ActionBtn>
                </RowActions>
              </Row>
            )
          })
        )}
      </List>
    </Modal>
  )
}

const List = styled.ul`
  list-style: none;
  margin: 0;
  padding: 8px;
  max-height: min(60vh, 480px);
  overflow-y: auto;
`

const Row = styled.li`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 10px;
  &[aria-busy='true'] {
    opacity: 0.55;
  }
  & + & {
    border-top: 1px solid ${({ theme }) => theme.colors.border.light};
  }
`

const RowText = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
`

const RowTitle = styled.span`
  font-size: 13.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  word-break: break-word;
`

const RowMeta = styled.span`
  font-size: 11.5px;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.text.tertiary};
`

const RowActions = styled.div`
  display: flex;
  gap: 6px;
  flex-shrink: 0;
`

const ActionBtn = styled.button<{ $danger?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 10px;
  font-size: 12.5px;
  font-weight: 600;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 8px;
  background: transparent;
  color: ${({ $danger, theme }) => ($danger ? theme.colors.error : theme.colors.text.secondary)};
  cursor: pointer;
  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.colors.hover};
  }
  &:disabled {
    cursor: default;
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
`

const Empty = styled.li`
  padding: 28px 16px;
  text-align: center;
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.text.tertiary};
`
