import { Body, Controller, Get, Param, Put, Req, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'

import {
  EventSideWeaponService,
  type SideWeaponView,
  type WeaponCatalogItem,
} from '../application/event-side-weapon.service'
import { SyncSideWeaponsDto } from './dto/side-weapon.dto'

interface AuthedRequest {
  user?: { id?: string; sub?: string }
}

const actorOf = (req: AuthedRequest) => req.user?.id ?? req.user?.sub ?? ''

@ApiTags('events')
@ApiBearerAuth()
@Controller('events')
@UseGuards(AuthGuard('jwt'))
export class EventSideWeaponController {
  constructor(private readonly service: EventSideWeaponService) {}

  @Get(':eventId/side-weapons')
  @ApiOperation({ summary: '사건의 모든 진영 투입 병기·장비 조회 — 진영 id를 키로 묶어 반환' })
  list(@Param('eventId') eventId: string): Promise<Record<string, SideWeaponView[]>> {
    return this.service.listByEvent(eventId)
  }

  @Get(':eventId/weapon-catalog')
  @ApiOperation({ summary: '투입 병기 선택용 마스터 카탈로그 (전차·항공기·화포·함선)' })
  catalog(): Promise<WeaponCatalogItem[]> {
    return this.service.getCatalog()
  }

  @Put(':eventId/sides/:sideId/weapons')
  @ApiOperation({ summary: '진영 한 곳의 투입 병기·장비 목록 동기화' })
  sync(
    @Req() req: AuthedRequest,
    @Param('eventId') eventId: string,
    @Param('sideId') sideId: string,
    @Body() dto: SyncSideWeaponsDto,
  ): Promise<SideWeaponView[]> {
    return this.service.syncForSide(actorOf(req), eventId, sideId, dto.weapons)
  }
}
