import { Injectable } from '@nestjs/common'
import { PrismaService } from '@prisma/prisma.service'
import { AggregateType, EventMethod, NotificationSubResource } from '@prisma/client'
import type { CreateNotificationData, INotificationRepository, NotificationRecord } from '../domain/notification.repository'

@Injectable()
export class NotificationPrismaRepository implements INotificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** 읽음 처리된 알림은 이 일수 경과 시, 모든 알림은 더 긴 일수 경과 시 정리 */
  private static readonly RETENTION_READ_DAYS = 30
  private static readonly RETENTION_MAX_DAYS = 90

  async create(data: CreateNotificationData): Promise<NotificationRecord> {
    // 옵션 1) 같은 레코드의 "아직 아무도 안 읽은" 수정 알림이 있으면 새 행 대신 시간·내용만 갱신해 목록 도배 방지.
    //         CREATE/DELETE는 항상 개별 생성하고, 누군가 한 번 읽은 뒤의 수정은 다시 새 알림으로 떠 재고지된다.
    //         단, 하위 리소스(subResourceType)가 다르면 별개 변경이므로 합치지 않는다. (예: "전기 수정" vs "인물 수정")
    //         (전역 read 플래그 → 개인별 읽음 전환에 따라 "read:false"를 "reads:none(아무도 안 읽음)"으로 일반화)
    if (data.method === EventMethod.UPDATE && data.recordId && data.ownerType) {
      const existing = await this.prisma.notification.findFirst({
        where: {
          method: EventMethod.UPDATE,
          recordId: data.recordId,
          ownerType: data.ownerType,
          subResourceType: data.subResourceType ?? null,
          reads: { none: {} },
        },
        orderBy: { createdAt: 'desc' },
      })
      if (existing) {
        const updated = await this.prisma.notification.update({
          where: { id: existing.id },
          data: {
            entityLabel: data.entityLabel,
            preview: data.preview ?? null,
            title: data.title ?? null,
            // 병합 시 최신 행위자/내용으로 갱신
            actorAccountId: data.actorAccountId ?? null,
            actorName: data.actorName ?? null,
            createdAt: new Date(),
          },
        })
        return this.toRecord(updated, false)
      }
    }

    const row = await this.prisma.notification.create({
      data: {
        entityLabel: data.entityLabel,
        method: data.method,
        ownerType: data.ownerType ?? undefined,
        subResourceType: data.subResourceType ?? undefined,
        actorAccountId: data.actorAccountId ?? undefined,
        actorName: data.actorName ?? undefined,
        recordId: data.recordId ?? undefined,
        preview: data.preview ?? undefined,
        title: data.title ?? undefined,
      },
    })

    return this.toRecord(row, false)
  }

  /**
   * 옵션 3) 보존 정책: 누군가 읽은 알림은 30일, 안 읽었어도 90일 경과분 삭제.
   * notification_read 행은 FK(onDelete: Cascade)로 함께 정리된다.
   * cron(NotificationCleanupTask)에서 주기 호출. 삭제된 행 수를 반환.
   */
  async prune(): Promise<number> {
    const now = Date.now()
    const readBefore = new Date(now - NotificationPrismaRepository.RETENTION_READ_DAYS * 86_400_000)
    const maxBefore = new Date(now - NotificationPrismaRepository.RETENTION_MAX_DAYS * 86_400_000)
    const { count } = await this.prisma.notification.deleteMany({
      where: {
        OR: [
          { createdAt: { lt: readBefore }, reads: { some: {} } },
          { createdAt: { lt: maxBefore } },
        ],
      },
    })
    return count
  }

  async findMany(
    accountId: string | undefined,
    options?: { limit?: number; unreadOnly?: boolean },
  ): Promise<NotificationRecord[]> {
    const limit = options?.limit ?? 100
    const rows = await this.prisma.notification.findMany({
      // unreadOnly: 해당 계정이 아직 안 읽은 것만 (계정 미상이면 전체)
      where: options?.unreadOnly && accountId ? { reads: { none: { accountId } } } : undefined,
      orderBy: { createdAt: 'desc' },
      take: limit,
      // 조회 계정의 읽음 기록만 함께 가져와 read 여부 판정 (없으면 미읽음)
      include: accountId
        ? { reads: { where: { accountId }, select: { notificationId: true } } }
        : undefined,
    })
    return rows.map((row) => {
      const read = accountId ? ((row as { reads?: unknown[] }).reads?.length ?? 0) > 0 : false
      return this.toRecord(row, read)
    })
  }

  /** 해당 계정의 읽음 기록을 upsert — 이미 읽었어도 멱등(에러 없음). */
  async markRead(accountId: string, id: string): Promise<void> {
    await this.prisma.notificationRead.upsert({
      where: { notificationId_accountId: { notificationId: id, accountId } },
      create: { notificationId: id, accountId },
      update: {},
    })
  }

  /** 해당 계정이 아직 안 읽은 알림 전부에 읽음 기록 삽입 (다른 계정 상태엔 영향 없음). */
  async markAllRead(accountId: string): Promise<void> {
    const unread = await this.prisma.notification.findMany({
      where: { reads: { none: { accountId } } },
      select: { id: true },
    })
    if (unread.length === 0) return
    await this.prisma.notificationRead.createMany({
      data: unread.map((notification) => ({ notificationId: notification.id, accountId })),
      skipDuplicates: true,
    })
  }

  private toRecord(
    row: {
      id: string
      entityLabel: string
      method: EventMethod
      ownerType: string | null
      subResourceType: NotificationSubResource | null
      actorAccountId: string | null
      actorName: string | null
      recordId: string | null
      preview: string | null
      title: string | null
      createdAt: Date
    },
    read: boolean,
  ): NotificationRecord {
    return {
      id: row.id,
      entityLabel: row.entityLabel,
      method: row.method as EventMethod,
      ownerType: row.ownerType as AggregateType | null,
      subResourceType: row.subResourceType,
      actorAccountId: row.actorAccountId,
      actorName: row.actorName,
      recordId: row.recordId,
      preview: row.preview,
      title: row.title,
      read,
      createdAt: row.createdAt,
    }
  }
}
