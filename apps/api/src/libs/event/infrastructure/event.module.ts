import { Module } from '@nestjs/common'
import { EventService } from '../application/event.service'
import { MilitaryEventService } from '../application/military-event.service'
import { EventPrismaRepository } from './event.prisma.repository'
import { EventController } from '../presentation/event.controller'
import { PrismaModule } from '../../shared/database'

@Module({
  imports: [PrismaModule],
  controllers: [EventController],
  providers: [
    EventService,
    MilitaryEventService,
    EventPrismaRepository,
    { provide: 'EventRepository', useClass: EventPrismaRepository },
  ],
  exports: [EventService, MilitaryEventService],
})
export class EventModule {}

