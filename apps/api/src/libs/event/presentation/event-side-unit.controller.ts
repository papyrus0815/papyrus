import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'

import { EventSideUnitService, type SideUnitView } from '../application/event-side-unit.service'
import { AddSideUnitDto, UpdateSideUnitDto } from './dto/side-unit.dto'

/**
 * 사건 진영의 투입 부대 API. 부대 자체는 /military-units, 이 작전 병력은 /observations(subjectType EVENT_SIDE_UNIT).
 */
@ApiTags('events')
@ApiBearerAuth()
@Controller('events')
@UseGuards(AuthGuard('jwt'))
export class EventSideUnitController {
  constructor(private readonly sideUnits: EventSideUnitService) {}

  /** 사건의 진영별 투입 부대 전부 — GET /events/:eventId/side-units */
  @Get(':eventId/side-units')
  async list(@Param('eventId') eventId: string): Promise<SideUnitView[]> {
    return this.sideUnits.list(eventId)
  }

  /** 진영에 부대 투입 — POST /events/:eventId/sides/:sideId/units */
  @Post(':eventId/sides/:sideId/units')
  async add(
    @Req() req: AuthedRequest,
    @Param('eventId') eventId: string,
    @Param('sideId') sideId: string,
    @Body() body: AddSideUnitDto,
  ): Promise<SideUnitView[]> {
    return this.sideUnits.add(actorOf(req), eventId, sideId, body)
  }

  /** 투입 줄 고치기(몫·메모·순서) — PATCH /events/:eventId/side-units/:id */
  @Patch(':eventId/side-units/:id')
  async update(
    @Req() req: AuthedRequest,
    @Param('eventId') eventId: string,
    @Param('id') id: string,
    @Body() body: UpdateSideUnitDto,
  ): Promise<SideUnitView[]> {
    return this.sideUnits.update(actorOf(req), eventId, id, body)
  }

  /** 투입 줄 빼기(부대 자체는 남는다) — DELETE /events/:eventId/side-units/:id */
  @Delete(':eventId/side-units/:id')
  async remove(
    @Req() req: AuthedRequest,
    @Param('eventId') eventId: string,
    @Param('id') id: string,
  ): Promise<SideUnitView[]> {
    return this.sideUnits.remove(actorOf(req), eventId, id)
  }

  /** 전투서열 지휘관을 군사부대 보직 정본(GovernmentPositionTenure)에 동기화 — POST /events/:eventId/side-units/:id/sync-commander-tenure */
  @Post(':eventId/side-units/:id/sync-commander-tenure')
  async syncCommanderTenure(
    @Req() req: AuthedRequest,
    @Param('eventId') eventId: string,
    @Param('id') id: string,
  ): Promise<SideUnitView[]> {
    return this.sideUnits.syncCommanderTenure(actorOf(req), eventId, id)
  }
}

/** passport jwt 전략이 채우는 요청 사용자 */
interface AuthedRequest {
  user?: { id?: string; sub?: string }
}

const actorOf = (req: AuthedRequest) => req.user?.id ?? req.user?.sub ?? ''
