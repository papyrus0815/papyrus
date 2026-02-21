import { Module } from '@nestjs/common'
import { CountryService } from '../application/country.service'
import { CountryPrismaRepository } from './country.prisma.repository'
import { CountryController } from '../presentation/country.controller'
import { NotificationModule } from '../../notification/notification.module'
import { PrismaModule } from '../../shared/database'

@Module({
  imports: [PrismaModule, NotificationModule],
  controllers: [CountryController],
  providers: [
    CountryService,
    CountryPrismaRepository,
    { provide: 'CountryRepository', useClass: CountryPrismaRepository },
  ],
  exports: [CountryService],
})
export class CountryModule {}
