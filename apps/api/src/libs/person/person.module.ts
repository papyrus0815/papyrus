import { Module } from '@nestjs/common'
import { PersonController } from './presentation/person.controller'
import { PersonByCountryController } from './presentation/person-by-country.controller'
import { GovernmentPositionController } from './presentation/government-position.controller'
import { PersonService } from './application/person.service'
import { PersonPrismaRepository } from './infrastructure/person.prisma.repository'
import { NotificationModule } from '../notification/notification.module'
import { UploadModule } from '../shared/upload/upload.module'

/**
 * 인물 모듈
 */
@Module({
  imports: [NotificationModule, UploadModule],
  controllers: [PersonController, PersonByCountryController, GovernmentPositionController],
  providers: [PersonService, PersonPrismaRepository],
  exports: [PersonService],
})
export class PersonModule {}
