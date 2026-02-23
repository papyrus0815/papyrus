import { Module } from '@nestjs/common'
import { CountryService } from '../application/country.service'
import { CountryPrismaRepository } from './country.prisma.repository'
import { CountryController } from '../presentation/country.controller'
import { NotificationModule } from '../../notification/notification.module'
import { PrismaModule } from '../../shared/database'
import { UploadModule } from '../../shared/upload/upload.module'

@Module({
  imports: [PrismaModule, NotificationModule, UploadModule],
  controllers: [CountryController],
  providers: [
    CountryService,
    CountryPrismaRepository,
    { provide: 'CountryRepository', useClass: CountryPrismaRepository },
  ],
  exports: [CountryService],
})
export class CountryModule {}
