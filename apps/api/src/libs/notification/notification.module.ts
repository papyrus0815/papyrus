import { Module } from '@nestjs/common'
import { NotificationController } from './presentation/notification.controller'
import { NotificationService } from './application/notification.service'
import { NotificationPrismaRepository } from './infrastructure/notification.prisma.repository'

@Module({
  controllers: [NotificationController],
  providers: [NotificationService, NotificationPrismaRepository],
  exports: [NotificationService],
})
export class NotificationModule {}
