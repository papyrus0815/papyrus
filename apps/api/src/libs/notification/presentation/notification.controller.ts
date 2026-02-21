import { Controller, Get, Patch, Param, Query } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { NotificationService } from '../application/notification.service'

@ApiTags('notifications')
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  async list(
    @Query('limit') limit?: string,
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    const options: { limit?: number; unreadOnly?: boolean } = {}
    if (limit != null) {
      const n = parseInt(limit, 10)
      if (!isNaN(n) && n > 0) options.limit = Math.min(n, 200)
    }
    if (unreadOnly === 'true' || unreadOnly === '1') options.unreadOnly = true
    const list = await this.notificationService.findMany(options)
    return list.map((n) => ({
      id: n.id,
      title: n.title ?? formatDisplayTitle(n.entityLabel, n.method),
      preview: n.preview ?? undefined,
      time: formatTime(n.createdAt),
      unread: !n.read,
      ownerType: n.ownerType ?? undefined,
      recordId: n.recordId ?? undefined,
    }))
  }

  @Patch('read-all')
  async markAllRead(): Promise<{ ok: true }> {
    await this.notificationService.markAllRead()
    return { ok: true }
  }

  @Patch(':id/read')
  async markRead(@Param('id') id: string): Promise<{ ok: true }> {
    await this.notificationService.markRead(id)
    return { ok: true }
  }
}

function formatDisplayTitle(entityLabel: string, method: string): string {
  const verb = method === 'CREATE' ? '등록' : method === 'UPDATE' ? '수정' : '삭제'
  return `"${entityLabel}"이(가) ${verb}되었습니다`
}

function formatTime(date: Date): string {
  const now = new Date()
  const d = new Date(date)
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60_000)
  const diffDays = Math.floor(diffMs / 86_400_000)
  if (diffMins < 1) return '방금'
  if (diffMins < 60) return `${diffMins}분 전`
  if (d.toDateString() === now.toDateString()) {
    return `오늘 ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
  }
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) {
    return `어제 ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
  }
  if (diffDays < 7) return `${diffDays}일 전`
  return d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
}
