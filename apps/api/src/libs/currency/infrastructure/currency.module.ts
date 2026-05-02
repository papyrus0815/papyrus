import { Module } from '@nestjs/common'
import { CurrencyService } from '../application/currency.service'
import { CurrencyPrismaRepository } from './currency.prisma.repository'
import { CurrencyController } from '../presentation/currency.controller'
import { PrismaModule } from '../../shared/database'

@Module({
  imports: [PrismaModule],
  controllers: [CurrencyController],
  providers: [
    CurrencyService,
    CurrencyPrismaRepository,
    { provide: 'CurrencyRepository', useClass: CurrencyPrismaRepository },
  ],
  exports: [CurrencyService],
})
export class CurrencyModule {}
