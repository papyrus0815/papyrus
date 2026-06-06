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
  read: boolean
  createdAt: Date
}

export interface INotificationRepository {
  create(data: CreateNotificationData): Promise<NotificationRecord>
  findMany(options?: { limit?: number; unreadOnly?: boolean }): Promise<NotificationRecord[]>
  markRead(id: string): Promise<void>
  markAllRead(): Promise<void>
}
