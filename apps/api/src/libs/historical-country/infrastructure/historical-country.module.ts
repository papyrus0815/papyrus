import { Module } from '@nestjs/common'
import { PrismaModule } from '../../shared/database'
import { NotificationModule } from '../../notification/notification.module'
import { UploadModule } from '../../shared/upload/upload.module'
import { HistoricalCountryController } from '../presentation/historical-country.controller'
import { HistoricalCountryService } from '../application/historical-country.service'
import { HistoricalCountryPrismaRepository } from './historical-country.prisma.repository'
import { HistoricalCountryTransitionPrismaRepository } from './historical-country-transition.prisma.repository'

@Module({
  imports: [PrismaModule, NotificationModule, UploadModule],
  controllers: [HistoricalCountryController],
  providers: [
    HistoricalCountryService,
    HistoricalCountryPrismaRepository,
    HistoricalCountryTransitionPrismaRepository,
  ],
  exports: [HistoricalCountryService],
})
export class HistoricalCountryModule {}
