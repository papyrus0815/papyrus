import { Module } from '@nestjs/common'

import { PrismaModule } from '../shared/database'

import { TradeCommodityController } from './presentation/trade-commodity.controller'
import { TradeRecordController } from './presentation/trade-record.controller'

@Module({
  imports: [PrismaModule],
  controllers: [TradeCommodityController, TradeRecordController],
})
export class TradeModule {}
