import { Module } from '@nestjs/common'

import { PrismaModule } from '../shared/database'
import { IdeologyController } from './presentation/ideology.controller'

/** 이념 카탈로그 — 정당·조직·인물 공용 */
@Module({
  imports: [PrismaModule],
  controllers: [IdeologyController],
})
export class IdeologyModule {}
