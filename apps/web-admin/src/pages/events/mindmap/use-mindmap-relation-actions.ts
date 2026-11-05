/**
 * 마인드맵에서 잇기·고치기·끊기 — 기존 관련 사건 API(연관 탭과 같은 길)를 쓰고, 연관 목록·조망·연결 그래프를 함께 다시 받는다.
 * 방향: 끈 마디(from)가 주 사건, 놓은 마디(to)가 관련 사건 — 방향 있는 종류는 from → to로 읽힌다.
 */
import { useQueryClient } from '@tanstack/react-query'

import { createEventRelation, deleteEventRelation, updateEventRelation } from '@/shared/api/event-relations'
import { confirm } from '@/shared/ui/confirm-dialog'
import { notify } from '@/shared/ui/toast'

import { eventRelationKeys } from '../detail/use-event-relations'
import { type RelationDraft } from './mindmap-relation-card'
import { type MindRelationItem } from './mindmap-types'

export function useMindmapRelationActions() {
  const queryClient = useQueryClient()
  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: eventRelationKeys.all }),
      queryClient.invalidateQueries({ queryKey: ['events', 'overview'] }),
      queryClient.invalidateQueries({ queryKey: ['events', 'relation-graph'] }),
    ])
  }
  const messageOf = (error: unknown, fallback: string) => (error instanceof Error && error.message ? error.message : fallback)

  return {
    create: async (fromId: string, toId: string, draft: RelationDraft) => {
      try {
        await createEventRelation(fromId, {
          relatedEventId: toId,
          relationType: draft.type,
          direction: 'outgoing',
          description: draft.description.trim() || null,
        })
        await refresh()
        notify.success('연결했습니다')
      } catch (error) {
        notify.error(messageOf(error, '연결하지 못했습니다'))
        throw error
      }
    },
    update: async (item: MindRelationItem, draft: RelationDraft) => {
      try {
        await updateEventRelation(item.fromId, item.id, {
          relationType: draft.type,
          description: draft.description.trim() || null,
        })
        await refresh()
        notify.success('연결을 고쳤습니다')
      } catch (error) {
        notify.error(messageOf(error, '고치지 못했습니다'))
        throw error
      }
    },
    remove: async (item: MindRelationItem) => {
      /* 되돌릴 수 없고 이유 글도 함께 사라진다 — 확인을 받는다(카드가 선 위에 떠 있어 잘못 누르기 쉽다) */
      const ok = await confirm({
        title: '이 연결을 끊을까요?',
        message: `${item.fromTitle} → ${item.toTitle}${item.description ? ' — 적어 둔 이유도 함께 지워집니다.' : ''}`,
        confirmLabel: '끊기',
        danger: true,
      })
      if (!ok) return
      try {
        await deleteEventRelation(item.fromId, item.id)
        await refresh()
        notify.success('연결을 끊었습니다')
      } catch (error) {
        notify.error(messageOf(error, '끊지 못했습니다'))
        throw error
      }
    },
  }
}
