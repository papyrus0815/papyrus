import { Module } from '@nestjs/common'
import { NotificationController } from './presentation/notification.controller'
import { NotificationService } from './application/notification.service'
import { NotificationPrismaRepository } from './infrastructure/notification.prisma.repository'
import { NotificationCleanupTask } from './infrastructure/notification-cleanup.task'

@Module({
  controllers: [NotificationController],
  providers: [NotificationService, NotificationPrismaRepository, NotificationCleanupTask],
  exports: [NotificationService],
})
export class NotificationModule {}
