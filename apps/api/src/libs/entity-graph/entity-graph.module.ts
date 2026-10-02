import { Module } from '@nestjs/common'

import { PrismaModule } from '../shared/database'
import { EntityGraphService } from './application/entity-graph.service'
import { EntityGraphController } from './presentation/entity-graph.controller'

/** 엔티티 연결 그래프(읽기 모델) — docs/entity-graph-design.md */
@Module({
  imports: [PrismaModule],
  controllers: [EntityGraphController],
  providers: [EntityGraphService],
})
export class EntityGraphModule {}
