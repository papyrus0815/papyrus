import { AggregateType, EventMethod } from '@prisma/client'

export interface CreateNotificationData {
  entityLabel: string
  method: EventMethod
  ownerType?: AggregateType
  recordId?: string
  preview?: string
  title?: string
}

export interface NotificationRecord {
  id: string
  entityLabel: string
  method: EventMethod
  ownerType: AggregateType | null
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
