import { Module } from '@nestjs/common'
import { PrismaModule } from '../shared/database'
import { CityService } from './application/city.service'
import { CityController } from './presentation/city.controller'

@Module({
  imports: [PrismaModule],
  controllers: [CityController],
  providers: [CityService],
  exports: [CityService],
})
export class CityModule {}
