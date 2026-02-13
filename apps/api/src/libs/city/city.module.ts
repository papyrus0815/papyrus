import { Module } from '@nestjs/common'
import { PrismaModule } from '../shared/database'
import { CityController } from './presentation/city.controller'

@Module({
  imports: [PrismaModule],
  controllers: [CityController],
  exports: [],
})
export class CityModule {}
