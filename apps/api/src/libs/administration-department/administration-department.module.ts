import { Module } from '@nestjs/common'
import { PrismaModule } from '../shared/database'
import { NotificationModule } from '../notification/notification.module'
import { AdministrationDepartmentController } from './presentation/administration-department.controller'

@Module({
  imports: [PrismaModule, NotificationModule],
  controllers: [AdministrationDepartmentController],
  exports: [],
})
export class AdministrationDepartmentModule {}
