import { Body, Controller, Get, Param, Put, Req, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'

import { EventSideService, type EventSideView } from '../application/event-side.service'
import { SyncEventSidesDto } from './dto/event-side.dto'

/**
 * 사건 진영(D1) API. 소속('어느 나라가 어느 편')은 사건 수정의 relatedCountries[].sideId로 쓴다.
 */
@ApiTags('events')
@ApiBearerAuth()
@Controller('events')
@UseGuards(AuthGuard('jwt'))
export class EventSideController {
  constructor(private readonly sides: EventSideService) {}

  /** 진영 + 소속 참여자 — GET /events/:eventId/sides */
  @Get(':eventId/sides')
  async list(@Param('eventId') eventId: string): Promise<EventSideView[]> {
    return this.sides.list(eventId)
  }

  /** 진영 목록 동기화 — PUT /events/:eventId/sides */
  @Put(':eventId/sides')
  async sync(
    @Req() req: AuthedRequest,
    @Param('eventId') eventId: string,
    @Body() body: SyncEventSidesDto,
  ): Promise<EventSideView[]> {
    return this.sides.sync(req.user?.id ?? req.user?.sub ?? '', eventId, body.sides)
  }
}

/** passport jwt 전략이 채우는 요청 사용자 */
interface AuthedRequest {
  user?: { id?: string; sub?: string }
}
