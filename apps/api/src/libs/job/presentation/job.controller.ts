import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { JobService } from '../application/job.service'
import { CreateJobDto, UpdateJobDto, JobResponseDto } from './dto'

@ApiTags('jobs')
@Controller('jobs')
export class JobController {
  constructor(private readonly jobService: JobService) {}

  @Get()
  async getAll(): Promise<JobResponseDto[]> {
    const jobs = await this.jobService.findAll()
    return jobs.map((j) => ({
      id: j.id,
      title: j.title,
      description: j.description,
      thumbnailUrl: j.thumbnailUrl,
      categoryId: j.categoryId,
      category: j.category
        ? {
            id: j.category.id,
            name: j.category.name,
            thumbnailUrl: j.category.thumbnailUrl,
          }
        : undefined,
      createdAt: j.createdAt.toISOString(),
      updatedAt: j.updatedAt.toISOString(),
    }))
  }

  @Get(':id')
  async getById(@Param('id') id: string): Promise<JobResponseDto> {
    const j = await this.jobService.findById(id)
    return {
      id: j.id,
      title: j.title,
      description: j.description,
      thumbnailUrl: j.thumbnailUrl,
      categoryId: j.categoryId,
      category: j.category
        ? {
            id: j.category.id,
            name: j.category.name,
            thumbnailUrl: j.category.thumbnailUrl,
          }
        : undefined,
      createdAt: j.createdAt.toISOString(),
      updatedAt: j.updatedAt.toISOString(),
    }
  }

  @Post()
  async create(@Body() dto: CreateJobDto): Promise<JobResponseDto> {
    const j = await this.jobService.create(dto)
    return {
      id: j.id,
      title: j.title,
      description: j.description,
      thumbnailUrl: j.thumbnailUrl,
      categoryId: j.categoryId,
      category: j.category
        ? {
            id: j.category.id,
            name: j.category.name,
            thumbnailUrl: j.category.thumbnailUrl,
          }
        : undefined,
      createdAt: j.createdAt.toISOString(),
      updatedAt: j.updatedAt.toISOString(),
    }
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateJobDto,
  ): Promise<JobResponseDto> {
    const j = await this.jobService.update(id, dto)
    return {
      id: j.id,
      title: j.title,
      description: j.description,
      thumbnailUrl: j.thumbnailUrl,
      categoryId: j.categoryId,
      category: j.category
        ? {
            id: j.category.id,
            name: j.category.name,
            thumbnailUrl: j.category.thumbnailUrl,
          }
        : undefined,
      createdAt: j.createdAt.toISOString(),
      updatedAt: j.updatedAt.toISOString(),
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string): Promise<void> {
    await this.jobService.delete(id)
  }
}
