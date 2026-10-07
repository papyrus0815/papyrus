import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'

import {
  EventOverviewService,
  type EventOverviewResponse,
} from '../application/event-overview.service'

/**
 * 최상위 사건 조망 API — 하위 사건 전부의 날짜·참여국·인물·진영·수치·기록 상태를 한 번에.
 * 컨트롤러 비대(event.controller.ts)를 더 키우지 않으려 진영(event-side.controller)처럼 분리.
 */
@ApiTags('events')
@ApiBearerAuth()
@Controller('events')
@UseGuards(AuthGuard('jwt'))
export class EventOverviewController {
  constructor(private readonly overview: EventOverviewService) {}

  /** 조망 — GET /events/:eventId/overview */
  @Get(':eventId/overview')
  async get(
    @Req() req: AuthedRequest,
    @Param('eventId') eventId: string,
  ): Promise<EventOverviewResponse> {
    return this.overview.getOverview(eventId, req.user?.id ?? req.user?.sub ?? '')
  }
}

/** passport jwt 전략이 채우는 요청 사용자 */
interface AuthedRequest {
  user?: { id?: string; sub?: string }
}
