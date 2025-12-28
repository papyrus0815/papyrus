import { Module } from '@nestjs/common'
import { MilitaryUnitController } from '../presentation/military-unit.controller'
import { MilitaryUnitService } from '../application/military-unit.service'
import { MilitaryUnitRepository } from './military-unit.repository'

@Module({
  controllers: [MilitaryUnitController],
  providers: [MilitaryUnitService, MilitaryUnitRepository],
  exports: [MilitaryUnitService],
})
export class MilitaryUnitModule {}
