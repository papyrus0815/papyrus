import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'

import { EventService } from '../application/event.service'

/**
 * 휴지통 정리 — 지운 지 30일(EventService.TRASH_RETENTION_DAYS)이 지난 사건을 매일 새벽 영구 삭제한다.
 * 예전엔 삭제 로그가 '3일 후 완전 삭제 예정'이라고 적었지만 정리 작업이 없어, 휴지통 57건 중 49건이 30일을
 * 넘겨 쌓여 있었다(2026-10-28). 같이 지운 하위는 상위와 함께 사라진다.
 */
@Injectable()
export class EventTrashCleanupTask {
  private readonly logger = new Logger(EventTrashCleanupTask.name)

  constructor(private readonly eventService: EventService) {}

  @Cron(CronExpression.EVERY_DAY_AT_4AM, { name: 'event-trash-cleanup' })
  async handleCleanup(): Promise<void> {
    try {
      const removed = await this.eventService.purgeExpiredTrash()
      if (removed > 0) this.logger.log(`휴지통의 오래된 사건 ${removed}건 영구 삭제`)
    } catch (error) {
      this.logger.error('휴지통 정리 실패', error instanceof Error ? error.stack : String(error))
    }
  }
}
