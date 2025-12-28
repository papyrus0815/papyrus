import { Module } from '@nestjs/common'
import { PrismaModule } from '../../shared/database'
import { HistoricalCountryController } from '../presentation/historical-country.controller'
import { HistoricalCountryService } from '../application/historical-country.service'
import { HistoricalCountryPrismaRepository } from './historical-country.prisma.repository'

@Module({
  imports: [PrismaModule],
  controllers: [HistoricalCountryController],
  providers: [HistoricalCountryService, HistoricalCountryPrismaRepository],
  exports: [HistoricalCountryService],
})
export class HistoricalCountryModule {}
