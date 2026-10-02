import {
  BadRequestException,
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
  Req,
  UseGuards,
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { ObservationSubjectType } from '@prisma/client'

import type { SourceView } from '../application/citation.service'
import {
  type MetricView,
  ObservationService,
  type ObservationView,
} from '../application/observation.service'
import { SourceService } from '../application/source.service'
import {
  CreateObservationDto,
  CreateSourceDto,
  OBSERVATION_SUBJECT_VALUES,
  UpdateObservationDto,
  UpdateSourceDto,
} from './dto/evidence.dto'

/**
 * 근거(출처·인용·측정값) API.
 * 설계: docs/event-detail-data-foundation.md D3.
 */
@ApiTags('evidence')
@ApiBearerAuth()
@Controller()
@UseGuards(AuthGuard('jwt'))
export class EvidenceController {
  constructor(
    private readonly observations: ObservationService,
    private readonly sources: SourceService,
  ) {}

  private actorId(req: AuthedRequest): string {
    return req.user?.id ?? req.user?.sub ?? ''
  }

  /** 지표 카탈로그 — GET /metric-definitions?domain=military */
  @Get('metric-definitions')
  async listMetrics(@Query('domain') domain?: string): Promise<MetricView[]> {
    return this.sources.listMetrics(domain)
  }

  /** 대상의 측정값 — GET /observations?subjectType=EVENT_SIDE&subjectId=… */
  @Get('observations')
  async listBySubject(
    @Query('subjectType') subjectType: string,
    @Query('subjectId') subjectId: string,
  ): Promise<ObservationView[]> {
    if (!subjectId) throw new BadRequestException('subjectId가 필요합니다')
    return this.observations.listBySubject(toSubjectType(subjectType), subjectId)
  }

  /** 사건 단위 측정값(사건 + 참여국 줄 + 진영) — GET /events/:eventId/observations */
  @Get('events/:eventId/observations')
  async listForEvent(@Param('eventId') eventId: string): Promise<ObservationView[]> {
    return this.observations.listForEvent(eventId)
  }

  @Post('observations')
  async createObservation(
    @Req() req: AuthedRequest,
    @Body() body: CreateObservationDto,
  ): Promise<ObservationView> {
    return this.observations.create(this.actorId(req), body)
  }

  @Patch('observations/:id')
  async updateObservation(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body() body: UpdateObservationDto,
  ): Promise<ObservationView> {
    return this.observations.update(this.actorId(req), id, body)
  }

  @Delete('observations/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeObservation(@Req() req: AuthedRequest, @Param('id') id: string): Promise<void> {
    return this.observations.remove(this.actorId(req), id)
  }

  /** 출처 검색 — GET /sources?q=…&limit=20 */
  @Get('sources')
  async searchSources(
    @Query('q') query?: string,
    @Query('limit') limit?: string,
  ): Promise<SourceView[]> {
    return this.sources.search(query, limit ? Number(limit) || 20 : 20)
  }

  @Post('sources')
  async createSource(@Req() req: AuthedRequest, @Body() body: CreateSourceDto): Promise<SourceView> {
    return this.sources.create(this.actorId(req), body)
  }

  @Patch('sources/:id')
  async updateSource(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body() body: UpdateSourceDto,
  ): Promise<SourceView> {
    return this.sources.update(this.actorId(req), id, body)
  }
}

/** passport jwt 전략이 채우는 요청 사용자 */
interface AuthedRequest {
  user?: { id?: string; sub?: string }
}

function toSubjectType(value: string): ObservationSubjectType {
  if (!(OBSERVATION_SUBJECT_VALUES as readonly string[]).includes(value)) {
    throw new BadRequestException('유효하지 않은 subjectType입니다')
  }
  return value as ObservationSubjectType
}
