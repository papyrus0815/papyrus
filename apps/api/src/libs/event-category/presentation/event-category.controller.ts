import { Controller, Get } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { PrismaClient } from '@prisma/client'

export interface EventCategoryResponse {
  id: string
  name: string
  description: string | null
  parentId: string | null
  createdAt: Date
  updatedAt: Date
}

@ApiTags('event-categories')
@Controller('event-categories')
export class EventCategoryController {
  constructor(private readonly prisma: PrismaClient) {}

  @Get()
  async getAllCategories(): Promise<EventCategoryResponse[]> {
    return this.prisma.eventCategory.findMany({
      orderBy: {
        createdAt: 'asc',
      },
    })
  }
}

