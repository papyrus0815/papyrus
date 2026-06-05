import { Injectable } from '@nestjs/common'
import { AggregateType, EventMethod } from '@prisma/client'
import type { CreateNotificationData, NotificationRecord } from '../domain/notification.repository'
import { NotificationPrismaRepository } from '../infrastructure/notification.prisma.repository'

@Injectable()
export class NotificationService {
  constructor(private readonly notificationRepository: NotificationPrismaRepository) {}

  create(data: CreateNotificationData): Promise<NotificationRecord> {
    return this.notificationRepository.create(data)
  }

  /** 인물 CRUD 알림 생성 헬퍼 */
  notifyPerson(entityLabel: string, method: EventMethod, recordId?: string, preview?: string): Promise<NotificationRecord> {
    return this.create({
      entityLabel,
      method,
      ownerType: AggregateType.PERSON,
      recordId,
      preview,
    })
  }

  /** 재임(역대 수반) CRUD 알림 생성 헬퍼 — entityLabel 예: "홍길동 - 대통령" */
  notifyTenure(entityLabel: string, method: EventMethod, recordId?: string, preview?: string): Promise<NotificationRecord> {
    return this.create({
      entityLabel,
      method,
      ownerType: AggregateType.PERSON,
      recordId,
      preview,
    })
  }

  /** 현대 국가 CRUD 알림 */
  notifyCountry(entityLabel: string, method: EventMethod, recordId?: string, preview?: string): Promise<NotificationRecord> {
    return this.create({
      entityLabel,
      method,
      ownerType: AggregateType.COUNTRY,
      recordId,
      preview,
    })
  }

  /** 역사적 국가 CRUD 알림 */
  notifyHistoricalCountry(entityLabel: string, method: EventMethod, recordId?: string, preview?: string): Promise<NotificationRecord> {
    return this.create({
      entityLabel,
      method,
      ownerType: AggregateType.HISTORICAL_COUNTRY,
      recordId,
      preview,
    })
  }

  /** 행정부처 CRUD 알림 */
  notifyAdministrationDepartment(entityLabel: string, method: EventMethod, recordId?: string, preview?: string): Promise<NotificationRecord> {
    return this.create({
      entityLabel,
      method,
      ownerType: AggregateType.ADMINISTRATION_DEPARTMENT,
      recordId,
      preview,
    })
  }

  /** 사건 CRUD 알림 */
  notifyEvent(entityLabel: string, method: EventMethod, recordId?: string, preview?: string): Promise<NotificationRecord> {
    return this.create({
      entityLabel,
      method,
      ownerType: AggregateType.EVENT,
      recordId,
      preview,
    })
  }

  /** 조직 CRUD 알림 */
  notifyOrganization(entityLabel: string, method: EventMethod, recordId?: string, preview?: string): Promise<NotificationRecord> {
    return this.create({
      entityLabel,
      method,
      ownerType: AggregateType.ORGANIZATION,
      recordId,
      preview,
    })
  }

  /** 정당 CRUD 알림 */
  notifyPoliticalParty(entityLabel: string, method: EventMethod, recordId?: string, preview?: string): Promise<NotificationRecord> {
    return this.create({
      entityLabel,
      method,
      ownerType: AggregateType.POLITICAL_PARTY,
      recordId,
      preview,
    })
  }

  findMany(options?: { limit?: number; unreadOnly?: boolean }): Promise<NotificationRecord[]> {
    return this.notificationRepository.findMany(options)
  }

  markRead(id: string): Promise<void> {
    return this.notificationRepository.markRead(id)
  }

  markAllRead(): Promise<void> {
    return this.notificationRepository.markAllRead()
  }
}
