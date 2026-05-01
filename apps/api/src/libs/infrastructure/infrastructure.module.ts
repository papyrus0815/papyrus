import { Module } from '@nestjs/common'
import { PrismaModule } from '../shared/database'
import { InfrastructureController } from './presentation/infrastructure.controller'

@Module({
  imports: [PrismaModule],
  controllers: [InfrastructureController],
  exports: [],
})
export class InfrastructureModule {}
