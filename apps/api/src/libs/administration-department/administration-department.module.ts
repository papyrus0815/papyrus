import { Module } from '@nestjs/common'

import { NotificationModule } from '../notification/notification.module'
import { PrismaModule } from '../shared/database'
import { AdministrationDepartmentService } from './application/administration-department.service'
import { AdministrationDepartmentController } from './presentation/administration-department.controller'

@Module({
  imports: [PrismaModule, NotificationModule],
  controllers: [AdministrationDepartmentController],
  providers: [AdministrationDepartmentService],
  exports: [AdministrationDepartmentService],
})
export class AdministrationDepartmentModule {}
