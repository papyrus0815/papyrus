import { Injectable } from '@nestjs/common'
import { AggregateType, EventMethod, NotificationSubResource } from '@prisma/client'
import { PrismaService } from '@prisma/prisma.service'
import type { CreateNotificationData, NotificationRecord } from '../domain/notification.repository'
import { NotificationPrismaRepository } from '../infrastructure/notification.prisma.repository'
import { getActorAccountId } from '../../shared/actor-context'

@Injectable()
export class NotificationService {
  constructor(
    private readonly notificationRepository: NotificationPrismaRepository,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * 알림 생성. 행위자(actor)는 명시값 우선, 없으면 요청 컨텍스트(ALS)에서 계정 ID를 읽어
   * displayName ?? username을 스냅샷으로 함께 저장한다.
   */
  async create(data: CreateNotificationData): Promise<NotificationRecord> {
    const actorAccountId = data.actorAccountId ?? getActorAccountId()
    let actorName = data.actorName
    if (!actorName && actorAccountId) {
      const acc = await this.prisma.account.findUnique({
        where: { id: actorAccountId },
        select: { displayName: true, username: true },
      })
      actorName = acc?.displayName ?? acc?.username ?? undefined
    }
    return this.notificationRepository.create({ ...data, actorAccountId, actorName })
  }

  /**
   * 인물 CRUD 알림 생성 헬퍼.
   * subResourceType을 주면 인물 본체가 아닌 하위 항목(예: 전기) 변경으로 표기된다.
   * 이때 method는 하위 항목 기준 동작(전기 신규=CREATE, 전기 변경=UPDATE)을 넘긴다.
   */
  notifyPerson(
    entityLabel: string,
    method: EventMethod,
    recordId?: string,
    preview?: string,
    subResourceType?: NotificationSubResource,
  ): Promise<NotificationRecord> {
    return this.create({
      entityLabel,
      method,
      ownerType: AggregateType.PERSON,
      subResourceType,
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
