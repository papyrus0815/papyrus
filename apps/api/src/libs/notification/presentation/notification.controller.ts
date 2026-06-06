import { Controller, Get, Patch, Param, Query, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { AuthGuard } from '@nestjs/passport'
import { NotificationService } from '../application/notification.service'

/** 알림 목록 항목 */
export interface NotificationListItemDto {
  id: string
  title: string
  preview?: string
  time: string
  unread: boolean
  ownerType?: string
  /** 변경의 초점이 된 하위 리소스(예: BIOGRAPHY). 아이콘·필터용. */
  subResourceType?: string
  /** 변경을 수행한 사용자 표시명 (없으면 미표시) */
  actorName?: string
  recordId?: string
}

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  async list(
    @Query('limit') limit?: string,
    @Query('unreadOnly') unreadOnly?: string,
  ): Promise<NotificationListItemDto[]> {
    const options: { limit?: number; unreadOnly?: boolean } = {}
    if (limit != null) {
      const n = parseInt(limit, 10)
      if (!isNaN(n) && n > 0) options.limit = Math.min(n, 200)
    }
    if (unreadOnly === 'true' || unreadOnly === '1') options.unreadOnly = true
    const list = await this.notificationService.findMany(options)
    return list.map((n) => ({
      id: n.id,
      title: n.title ?? formatDisplayTitle(n.entityLabel, n.method, n.subResourceType),
      preview: n.preview ?? undefined,
      time: formatTime(n.createdAt),
      unread: !n.read,
      ownerType: n.ownerType ?? undefined,
      subResourceType: n.subResourceType ?? undefined,
      actorName: n.actorName ?? undefined,
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

/** 하위 리소스 코드 → 한글 라벨 */
const SUB_RESOURCE_LABEL: Record<string, string> = {
  BIOGRAPHY: '전기',
  CAREER: '경력',
  EDUCATION: '학력',
  AWARD: '수상',
}

function formatDisplayTitle(entityLabel: string, method: string, subResourceType?: string | null): string {
  const label = subResourceType ? SUB_RESOURCE_LABEL[subResourceType] : undefined
  if (label) {
    // 하위 리소스 변경: "{인물}의 전기가 추가/수정/삭제되었습니다"
    const verb = method === 'CREATE' ? '추가' : method === 'UPDATE' ? '수정' : '삭제'
    return `"${entityLabel}"의 ${label}${subjectJosa(label)} ${verb}되었습니다`
  }
  const verb = method === 'CREATE' ? '등록' : method === 'UPDATE' ? '수정' : '삭제'
  return `"${entityLabel}"${subjectJosa(entityLabel)} ${verb}되었습니다`
}

/**
 * 주격 조사(이/가) 자동 선택 — 라벨 끝 글자의 받침 유무로 판정.
 * 한글 음절(가–힣)이 아니면 안전하게 "이(가)"로 둔다.
 */
function subjectJosa(label: string): string {
  const ch = label.trim().slice(-1)
  if (!ch) return '이(가)'
  const code = ch.charCodeAt(0)
  if (code >= 0xac00 && code <= 0xd7a3) {
    return (code - 0xac00) % 28 !== 0 ? '이' : '가'
  }
  return '이(가)'
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
