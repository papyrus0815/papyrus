import { Module } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { PersonController } from './presentation/person.controller'
import { GovernmentPositionController } from './presentation/government-position.controller'
import { PersonService } from './application/person.service'
import { PersonPrismaRepository } from './infrastructure/person.prisma.repository'

/**
 * 인물 모듈
 */
@Module({
  controllers: [PersonController, GovernmentPositionController],
  providers: [
    PersonService,
    PersonPrismaRepository,
  ],
  exports: [PersonService],
})
export class PersonModule {}
