import { Module } from '@nestjs/common'

import { PrismaModule } from '../shared/database'

import { PoliticalSystemController } from './presentation/political-system.controller'

@Module({
  imports: [PrismaModule],
  controllers: [PoliticalSystemController],
})
export class PoliticalSystemModule {}
