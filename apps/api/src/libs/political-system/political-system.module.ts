import { Module } from '@nestjs/common'

import { PrismaModule } from '../shared/database'

import { ChamberController } from './presentation/chamber.controller'
import { PoliticalSystemController } from './presentation/political-system.controller'

@Module({
  imports: [PrismaModule],
  controllers: [PoliticalSystemController, ChamberController],
})
export class PoliticalSystemModule {}
