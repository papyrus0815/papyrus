import { Controller, Get } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { PrismaService } from '@prisma/prisma.service'

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
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async getAllCategories(): Promise<EventCategoryResponse[]> {
    return this.prisma.eventCategory.findMany({
      orderBy: {
        createdAt: 'asc',
      },
    })
  }
}

