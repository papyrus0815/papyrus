import { Body, Controller, Get, Param, Put, Req, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'

import {
  EventMapFeatureService,
  type EventMapFeatureView,
} from '../application/event-map-feature.service'
import { SyncEventMapFeaturesDto } from './dto/event-map-feature.dto'

interface AuthedRequest {
  user?: { id?: string; sub?: string }
}

const actorOf = (req: AuthedRequest) => req.user?.id ?? req.user?.sub ?? ''

@ApiTags('events')
@ApiBearerAuth()
@Controller('events')
@UseGuards(AuthGuard('jwt'))
export class EventMapFeatureController {
  constructor(private readonly service: EventMapFeatureService) {}

  @Get(':eventId/map-features')
  @ApiOperation({ summary: '사건의 지도 피처(기동 화살표·포위망·전선·거점) 목록 조회' })
  list(@Param('eventId') eventId: string): Promise<EventMapFeatureView[]> {
    return this.service.list(eventId)
  }

  @Put(':eventId/map-features')
  @ApiOperation({ summary: '사건의 지도 피처 목록 동기화' })
  sync(
    @Req() req: AuthedRequest,
    @Param('eventId') eventId: string,
    @Body() dto: SyncEventMapFeaturesDto,
  ): Promise<EventMapFeatureView[]> {
    return this.service.sync(actorOf(req), eventId, dto.features)
  }
}
