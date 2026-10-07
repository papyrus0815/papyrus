import { Module } from '@nestjs/common'
import { EventService } from '../application/event.service'
import { MilitaryEventService } from '../application/military-event.service'
import { EventCountryParticipantService } from '../application/event-country-participant.service'
import { EventRelationService } from '../application/event-relation.service'
import { EventSideService } from '../application/event-side.service'
import { EventSectionService } from '../application/event-section.service'
import { EventSideController } from '../presentation/event-side.controller'
import { EventPrismaRepository } from './event.prisma.repository'
import { EventController } from '../presentation/event.controller'
import { PrismaModule } from '../../shared/database'
import { NotificationModule } from '../../notification/notification.module'

@Module({
  imports: [PrismaModule, NotificationModule],
  controllers: [EventController, EventSideController],
  providers: [
    EventService,
    MilitaryEventService,
    EventCountryParticipantService,
    EventRelationService,
    EventSideService,
    EventSectionService,
    EventPrismaRepository,
    { provide: 'EventRepository', useClass: EventPrismaRepository },
  ],
  exports: [EventService, MilitaryEventService, EventCountryParticipantService, EventSideService],
})
export class EventModule {}

