import { Module } from '@nestjs/common'
import { PrismaModule } from '../shared/database'
import { NaturalFeatureController } from './presentation/natural-feature.controller'

@Module({
  imports: [PrismaModule],
  controllers: [NaturalFeatureController],
  exports: [],
})
export class NaturalFeatureModule {}
