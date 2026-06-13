import { Module } from '@nestjs/common'
import { PrismaModule } from '../shared/database'
import { NotificationModule } from '../notification/notification.module'
import { CityService } from './application/city.service'
import { CityController } from './presentation/city.controller'

@Module({
  imports: [PrismaModule, NotificationModule],
  controllers: [CityController],
  providers: [CityService],
  exports: [CityService],
})
export class CityModule {}
