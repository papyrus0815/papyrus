import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { NotificationPrismaRepository } from './notification.prisma.repository'

/**
 * 보존 정책에 따라 오래된 알림을 주기적으로 정리하는 cron 태스크.
 * 매일 새벽 4시(서버 로컬 시각) 실행 — 알림 생성 경로와 분리해 부하 없음.
 */
@Injectable()
export class NotificationCleanupTask {
  private readonly logger = new Logger(NotificationCleanupTask.name)

  constructor(private readonly notificationRepository: NotificationPrismaRepository) {}

  @Cron(CronExpression.EVERY_DAY_AT_4AM, { name: 'notification-cleanup' })
  async handleCleanup(): Promise<void> {
    try {
      const removed = await this.notificationRepository.prune()
      if (removed > 0) this.logger.log(`오래된 알림 ${removed}건 정리`)
    } catch (err) {
      this.logger.error('알림 정리 실패', err instanceof Error ? err.stack : String(err))
    }
  }
}
