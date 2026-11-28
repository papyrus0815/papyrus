import { Module } from '@nestjs/common'
import { MilitaryRankController } from '../../military-rank/military-rank.controller'
import { MilitaryRankService } from '../../military-rank/military-rank.service'
import { MilitaryUnitController } from '../presentation/military-unit.controller'
import { MilitaryUnitService } from '../application/military-unit.service'
import { MilitaryUnitRepository } from './military-unit.repository'

@Module({
  controllers: [MilitaryUnitController, MilitaryRankController],
  providers: [MilitaryUnitService, MilitaryUnitRepository, MilitaryRankService],
  exports: [MilitaryUnitService, MilitaryRankService],
})
export class MilitaryUnitModule {}
