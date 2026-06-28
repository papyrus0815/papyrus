import { AggregateType, EventMethod, NotificationSubResource } from '@prisma/client'

export interface CreateNotificationData {
  entityLabel: string
  method: EventMethod
  ownerType?: AggregateType
  /** 변경의 초점이 된 하위 리소스 (선택). 예: BIOGRAPHY */
  subResourceType?: NotificationSubResource
  /** 변경 수행 계정 ID (선택). 미지정 시 요청 컨텍스트(ALS)에서 해석. */
  actorAccountId?: string
  /** 행위자 표시명 스냅샷 (선택). NotificationService가 actorAccountId로 채움. */
  actorName?: string
  /** 수신 대상 계정 (선택). 지정 시 해당 계정 피드에만 노출(타겟 알림). 미지정=전역 공유피드. */
  recipientAccountId?: string
  recordId?: string
  preview?: string
  title?: string
}

export interface NotificationRecord {
  id: string
  entityLabel: string
  method: EventMethod
  ownerType: AggregateType | null
  subResourceType: NotificationSubResource | null
  actorAccountId: string | null
  actorName: string | null
  recordId: string | null
  preview: string | null
  title: string | null
  /** 조회 계정 기준 읽음 여부 (공유 피드 + 개인별 읽음). 계정 미상이면 false. */
  read: boolean
  createdAt: Date
}

export interface INotificationRepository {
  create(data: CreateNotificationData): Promise<NotificationRecord>
  /** accountId 기준으로 각 알림의 read 여부를 계산. unreadOnly는 해당 계정이 안 읽은 것만. */
  findMany(accountId: string | undefined, options?: { limit?: number; unreadOnly?: boolean }): Promise<NotificationRecord[]>
  /** 해당 계정의 읽음 기록 upsert (멱등). */
  markRead(accountId: string, id: string): Promise<void>
  /** 해당 계정이 아직 안 읽은 모든 알림을 읽음 처리. */
  markAllRead(accountId: string): Promise<void>
}
