import { Module } from '@nestjs/common'
import { PrismaModule } from '../shared/database'
import { TreatyController } from './presentation/treaty.controller'

@Module({
  imports: [PrismaModule],
  controllers: [TreatyController],
  exports: [],
})
export class TreatyModule {}
