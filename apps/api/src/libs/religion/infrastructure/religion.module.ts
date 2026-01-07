import { Module } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { ReligionController } from '../presentation/religion.controller'
import { ReligionService } from '../application/religion.service'
import { ReligionRepository } from './religion.repository'

@Module({
  controllers: [ReligionController],
  providers: [
    ReligionService,
    ReligionRepository,
  ],
  exports: [ReligionService],
})
export class ReligionModule {}
