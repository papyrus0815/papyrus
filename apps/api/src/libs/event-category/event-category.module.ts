import { Module } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { EventCategoryController } from './presentation/event-category.controller'

@Module({
  controllers: [EventCategoryController],
  providers: [],
})
export class EventCategoryModule {}

