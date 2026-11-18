import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { ApiTags } from '@nestjs/swagger'
import { EventSeriesService } from '../application/event-series.service'
import {
  CreateEventSeriesDto,
  type EventSeriesDetailDto,
  type EventSeriesItemDto,
  UpdateEventSeriesDto,
} from './dto/event-series.dto'

@ApiTags('event-series')
@Controller('event-series')
@UseGuards(AuthGuard('jwt'))
export class EventSeriesController {
  constructor(private readonly eventSeriesService: EventSeriesService) {}

  @Get()
  async list(
    @Request() req: { user?: { id?: string } },
    @Query('organizationId') organizationId?: string,
    @Query('countryId') countryId?: string,
    @Query('historicalCountryId') historicalCountryId?: string,
    @Query('hostedByCountryId') hostedByCountryId?: string,
    @Query('status') status?: string,
    @Query('domain') domain?: string,
    @Query('q') q?: string,
  ): Promise<EventSeriesItemDto[]> {
    return this.eventSeriesService.list(
      {
        organizationId,
        countryId,
        historicalCountryId,
        hostedByCountryId,
        status,
        domain,
        q,
      },
      req.user?.id,
    )
  }

  @Get(':id')
  async getById(
    @Param('id') id: string,
    @Request() req: { user?: { id?: string } },
  ): Promise<EventSeriesDetailDto> {
    return this.eventSeriesService.getById(id, req.user?.id)
  }

  @Post()
  async create(
    @Body() dto: CreateEventSeriesDto,
    @Request() req: { user?: { id?: string } },
  ): Promise<EventSeriesDetailDto> {
    return this.eventSeriesService.create(dto, req.user?.id)
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateEventSeriesDto,
    @Request() req: { user?: { id?: string } },
  ): Promise<EventSeriesDetailDto> {
    return this.eventSeriesService.update(id, dto, req.user?.id)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id') id: string,
    @Request() req: { user?: { id?: string } },
  ): Promise<void> {
    await this.eventSeriesService.delete(id, req.user?.id)
  }
}
