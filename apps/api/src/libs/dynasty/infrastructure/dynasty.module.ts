import { Module } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { DynastyController } from '../presentation/dynasty.controller'
import { DynastyService } from '../application/dynasty.service'
import { DynastyRepository } from './dynasty.repository'

@Module({
  controllers: [DynastyController],
  providers: [
    DynastyService,
    DynastyRepository,
    {
      provide: PrismaClient,
      useValue: new PrismaClient(),
    },
  ],
  exports: [DynastyService],
})
export class DynastyModule {}
