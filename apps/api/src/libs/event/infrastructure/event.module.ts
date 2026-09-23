import { Module } from '@nestjs/common'
import { EventService } from '../application/event.service'
import { MilitaryEventService } from '../application/military-event.service'
import { EventCountryParticipantService } from '../application/event-country-participant.service'
import { EventPrismaRepository } from './event.prisma.repository'
import { EventController } from '../presentation/event.controller'
import { PrismaModule } from '../../shared/database'
import { NotificationModule } from '../../notification/notification.module'

@Module({
  imports: [PrismaModule, NotificationModule],
  controllers: [EventController],
  providers: [
    EventService,
    MilitaryEventService,
    EventCountryParticipantService,
    EventPrismaRepository,
    { provide: 'EventRepository', useClass: EventPrismaRepository },
  ],
  exports: [EventService, MilitaryEventService, EventCountryParticipantService],
})
export class EventModule {}

