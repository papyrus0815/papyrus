import { Injectable } from '@nestjs/common'
import { PrismaService } from '@prisma/prisma.service'
import { EventMethod } from '@prisma/client'
import type { CreateNotificationData, INotificationRepository, NotificationRecord } from '../domain/notification.repository'

@Injectable()
export class NotificationPrismaRepository implements INotificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateNotificationData): Promise<NotificationRecord> {
    const row = await this.prisma.notification.create({
      data: {
        entityLabel: data.entityLabel,
        method: data.method,
        ownerType: data.ownerType ?? undefined,
        recordId: data.recordId ?? undefined,
        preview: data.preview ?? undefined,
        title: data.title ?? undefined,
      },
    })
    return this.toRecord(row)
  }

  async findMany(options?: { limit?: number; unreadOnly?: boolean }): Promise<NotificationRecord[]> {
    const limit = options?.limit ?? 100
    const rows = await this.prisma.notification.findMany({
      where: options?.unreadOnly ? { read: false } : undefined,
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
    return rows.map((r) => this.toRecord(r))
  }

  async markRead(id: string): Promise<void> {
    await this.prisma.notification.update({
      where: { id },
      data: { read: true },
    })
  }

  async markAllRead(): Promise<void> {
    await this.prisma.notification.updateMany({
      data: { read: true },
    })
  }

  private toRecord(row: {
    id: string
    entityLabel: string
    method: EventMethod
    ownerType: string | null
    recordId: string | null
    preview: string | null
    title: string | null
    read: boolean
    createdAt: Date
  }): NotificationRecord {
    return {
      id: row.id,
      entityLabel: row.entityLabel,
      method: row.method as EventMethod,
      ownerType: row.ownerType as any,
      recordId: row.recordId,
      preview: row.preview,
      title: row.title,
      read: row.read,
      createdAt: row.createdAt,
    }
  }
}
