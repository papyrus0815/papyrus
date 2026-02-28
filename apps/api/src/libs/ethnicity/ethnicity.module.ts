import { Module } from '@nestjs/common'
import { PrismaModule } from '../shared/database'
import { EthnicityController } from './presentation/ethnicity.controller'

@Module({
  imports: [PrismaModule],
  controllers: [EthnicityController],
  exports: [],
})
export class EthnicityModule {}
