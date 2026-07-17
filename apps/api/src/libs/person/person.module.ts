import { Module } from '@nestjs/common'
import { PersonController } from './presentation/person.controller'
import { PersonByCountryController } from './presentation/person-by-country.controller'
import { PersonByDynastyController } from './presentation/person-by-dynasty.controller'
import { GovernmentPositionController } from './presentation/government-position.controller'
import { PersonLifeEventController } from './presentation/person-life-event.controller'
import { PersonRecordsController } from './presentation/person-records.controller'
import { PersonContemporariesController } from './presentation/person-contemporaries.controller'
import { PersonGroupController } from './presentation/person-group.controller'
import { PersonService } from './application/person.service'
import { PersonRecordsService } from './application/person-records.service'
import { PersonContemporariesService } from './application/person-contemporaries.service'
import { PersonGroupService } from './application/person-group.service'
import { PersonPrismaRepository } from './infrastructure/person.prisma.repository'
import { NotificationModule } from '../notification/notification.module'
import { UploadModule } from '../shared/upload/upload.module'

/**
 * 인물 모듈
 */
@Module({
  imports: [NotificationModule, UploadModule],
  controllers: [
    PersonController,
    PersonByCountryController,
    PersonByDynastyController,
    GovernmentPositionController,
    PersonLifeEventController,
    PersonRecordsController,
    PersonContemporariesController,
    PersonGroupController,
  ],
  providers: [PersonService, PersonRecordsService, PersonContemporariesService, PersonGroupService, PersonPrismaRepository],
  exports: [PersonService, PersonGroupService],
})
export class PersonModule {}
