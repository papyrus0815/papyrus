import { Module } from '@nestjs/common'
import { EventService } from '../application/event.service'
import { MilitaryEventService } from '../application/military-event.service'
import { EventCountryParticipantService } from '../application/event-country-participant.service'
import { EventRelationService } from '../application/event-relation.service'
import { EventSideService } from '../application/event-side.service'
import { EventTerritoryTransferService } from '../application/event-territory-transfer.service'
import { EventTerritoryTransferController } from '../presentation/event-territory-transfer.controller'
import { EventDepartmentService } from '../application/event-department.service'
import { EventDepartmentController } from '../presentation/event-department.controller'
import { EventSectionService } from '../application/event-section.service'
import { EventSideController } from '../presentation/event-side.controller'
import { EventOverviewController } from '../presentation/event-overview.controller'
import { EventOverviewService } from '../application/event-overview.service'
import { EventPrismaRepository } from './event.prisma.repository'
import { EventTrashCleanupTask } from './event-trash-cleanup.task'
import { EventController } from '../presentation/event.controller'
import { EventPhaseController } from '../presentation/event-phase.controller'
import { PrismaModule } from '../../shared/database'
import { NotificationModule } from '../../notification/notification.module'

@Module({
  imports: [PrismaModule, NotificationModule],
  controllers: [
    EventController,
    EventSideController,
    EventOverviewController,
    EventPhaseController,
    EventTerritoryTransferController,
    EventDepartmentController,
  ],
  providers: [
    EventService,
    MilitaryEventService,
    EventCountryParticipantService,
    EventRelationService,
    EventSideService,
    EventTerritoryTransferService,
    EventDepartmentService,
    EventSectionService,
    EventOverviewService,
    EventPrismaRepository,
    EventTrashCleanupTask,
    { provide: 'EventRepository', useClass: EventPrismaRepository },
  ],
  exports: [EventService, MilitaryEventService, EventCountryParticipantService, EventSideService],
})
export class EventModule {}

