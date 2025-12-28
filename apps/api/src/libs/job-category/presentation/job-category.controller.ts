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
import { JobCategoryService } from '../application/job-category.service'
import {
  CreateJobCategoryDto,
  UpdateJobCategoryDto,
  JobCategoryResponseDto,
} from './dto'

@ApiTags('job-categories')
@Controller('job-categories')
export class JobCategoryController {
  constructor(private readonly jobCategoryService: JobCategoryService) {}

  @Get()
  async getAll(): Promise<JobCategoryResponseDto[]> {
    const categories = await this.jobCategoryService.findAll()
    return categories.map((c) => ({
      id: c.id,
      name: c.name,
      thumbnailUrl: c.thumbnailUrl,
      parentId: c.parentId,
      parent: c.parent
        ? {
            id: c.parent.id,
            name: c.parent.name,
          }
        : undefined,
      children: c.children?.map((child) => ({
        id: child.id,
        name: child.name,
      })),
      jobCount: c._count?.jobs || 0,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }))
  }

  @Get(':id')
  async getById(@Param('id') id: string): Promise<JobCategoryResponseDto> {
    const c = await this.jobCategoryService.findById(id)
    return {
      id: c.id,
      name: c.name,
      thumbnailUrl: c.thumbnailUrl,
      parentId: c.parentId,
      parent: c.parent
        ? {
            id: c.parent.id,
            name: c.parent.name,
          }
        : undefined,
      children: c.children?.map((child) => ({
        id: child.id,
        name: child.name,
      })),
      jobCount: c._count?.jobs || 0,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }
  }

  @Post()
  async create(
    @Body() dto: CreateJobCategoryDto,
  ): Promise<JobCategoryResponseDto> {
    const c = await this.jobCategoryService.create(dto)
    return {
      id: c.id,
      name: c.name,
      thumbnailUrl: c.thumbnailUrl,
      parentId: c.parentId,
      parent: c.parent
        ? {
            id: c.parent.id,
            name: c.parent.name,
          }
        : undefined,
      children: c.children?.map((child) => ({
        id: child.id,
        name: child.name,
      })),
      jobCount: c._count?.jobs || 0,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateJobCategoryDto,
  ): Promise<JobCategoryResponseDto> {
    const c = await this.jobCategoryService.update(id, dto)
    return {
      id: c.id,
      name: c.name,
      thumbnailUrl: c.thumbnailUrl,
      parentId: c.parentId,
      parent: c.parent
        ? {
            id: c.parent.id,
            name: c.parent.name,
          }
        : undefined,
      children: c.children?.map((child) => ({
        id: child.id,
        name: child.name,
      })),
      jobCount: c._count?.jobs || 0,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string): Promise<void> {
    await this.jobCategoryService.delete(id)
  }
}


