import { Body, Controller, Get, Param, Put, Req, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'

import { EventTerritoryTransferService } from '../application/event-territory-transfer.service'
import {
  type CountryTerritoryChangeDto,
  SyncTerritoryTransfersDto,
  type TerritoryTransferDto,
} from './dto/territory-transfer.dto'

/**
 * 영토 이전 API — 사건 쪽 목록·동기화와 나라 쪽 '영토 변천'.
 * docs/event-territory-transfer-review.md
 */
@ApiTags('events')
@ApiBearerAuth()
@Controller()
@UseGuards(AuthGuard('jwt'))
export class EventTerritoryTransferController {
  constructor(private readonly transfers: EventTerritoryTransferService) {}

  /** 사건의 영토 이전 — GET /events/:eventId/territory-transfers */
  @Get('events/:eventId/territory-transfers')
  async list(@Param('eventId') eventId: string): Promise<TerritoryTransferDto[]> {
    return this.transfers.list(eventId)
  }

  /** 영토 이전 목록 동기화 — PUT /events/:eventId/territory-transfers (빠진 줄은 지운다) */
  @Put('events/:eventId/territory-transfers')
  async sync(
    @Req() req: AuthedRequest,
    @Param('eventId') eventId: string,
    @Body() body: SyncTerritoryTransfersDto,
  ): Promise<TerritoryTransferDto[]> {
    return this.transfers.sync(req.user?.id ?? req.user?.sub ?? '', eventId, body.transfers, body.fillParticipants ?? true)
  }

  /** 역사 국가의 영토 변천 — GET /historical-countries/:id/territory-changes */
  @Get('historical-countries/:id/territory-changes')
  async historicalCountryChanges(@Param('id') id: string): Promise<CountryTerritoryChangeDto[]> {
    return this.transfers.listForParty({ historicalCountryId: id })
  }

  /** 현대 국가의 영토 변천 — GET /countries/:id/territory-changes */
  @Get('countries/:id/territory-changes')
  async countryChanges(@Param('id') id: string): Promise<CountryTerritoryChangeDto[]> {
    return this.transfers.listForParty({ countryId: id })
  }
}

/** passport jwt 전략이 채우는 요청 사용자 */
interface AuthedRequest {
  user?: { id?: string; sub?: string }
}
