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
import { DynastyService } from '../application/dynasty.service'
import { CreateDynastyDto, UpdateDynastyDto, DynastyResponseDto } from './dto'

@ApiTags('dynasties')
@Controller('dynasties')
export class DynastyController {
  constructor(private readonly dynastyService: DynastyService) {}

  @Get()
  async getAll(): Promise<DynastyResponseDto[]> {
    const dynasties = await this.dynastyService.findAll()
    return dynasties.map((d) => ({
      id: d.id,
      name: d.name,
      description: d.description,
      startDate: d.startDate ? d.startDate.toISOString() : null,
      endDate: d.endDate ? d.endDate.toISOString() : null,
      thumbnailUrl: d.thumbnailUrl,
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
    }))
  }

  @Get(':id')
  async getById(@Param('id') id: string): Promise<DynastyResponseDto> {
    const d = await this.dynastyService.findById(id)
    return {
      id: d.id,
      name: d.name,
      description: d.description,
      startDate: d.startDate ? d.startDate.toISOString() : null,
      endDate: d.endDate ? d.endDate.toISOString() : null,
      thumbnailUrl: d.thumbnailUrl,
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
    }
  }

  @Post()
  async create(@Body() dto: CreateDynastyDto): Promise<DynastyResponseDto> {
    const d = await this.dynastyService.create({
      name: dto.name,
      description: dto.description,
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      thumbnailUrl: dto.thumbnailUrl,
    })
    return {
      id: d.id,
      name: d.name,
      description: d.description,
      startDate: d.startDate ? d.startDate.toISOString() : null,
      endDate: d.endDate ? d.endDate.toISOString() : null,
      thumbnailUrl: d.thumbnailUrl,
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
    }
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateDynastyDto,
  ): Promise<DynastyResponseDto> {
    const d = await this.dynastyService.update(id, {
      name: dto.name,
      description: dto.description,
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      thumbnailUrl: dto.thumbnailUrl,
    })
    return {
      id: d.id,
      name: d.name,
      description: d.description,
      startDate: d.startDate ? d.startDate.toISOString() : null,
      endDate: d.endDate ? d.endDate.toISOString() : null,
      thumbnailUrl: d.thumbnailUrl,
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string): Promise<void> {
    await this.dynastyService.delete(id)
  }
}
