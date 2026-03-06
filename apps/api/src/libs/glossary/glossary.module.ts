import { Module } from '@nestjs/common'
import { PrismaModule } from '../shared/database'
import { GlossaryController } from './presentation/glossary.controller'

@Module({
  imports: [PrismaModule],
  controllers: [GlossaryController],
  exports: [],
})
export class GlossaryModule {}
