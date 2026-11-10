import { Body, Controller, Get, Param, Put, Req, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'

import {
  type EventContextCatalogItem,
  EventContextLinkService,
  type EventContextLinkView,
} from '../application/event-context-link.service'
import { SyncEventContextLinksDto } from './dto/event-context-link.dto'

interface AuthedRequest {
  user?: { id?: string; sub?: string }
}

const actorOf = (req: AuthedRequest) => req.user?.id ?? req.user?.sub ?? ''

@ApiTags('events')
@ApiBearerAuth()
@Controller('events')
@UseGuards(AuthGuard('jwt'))
export class EventContextLinkController {
  constructor(private readonly service: EventContextLinkService) {}

  @Get(':eventId/context-links')
  @ApiOperation({ summary: '사건의 타 도메인 맥락 연결(지리·인프라·기후·자원·시설·법령·사회현상) 조회' })
  list(@Param('eventId') eventId: string): Promise<EventContextLinkView[]> {
    return this.service.list(eventId)
  }

  @Get(':eventId/context-catalog')
  @ApiOperation({ summary: '사건 맥락 연결 선택용 7대 도메인 통합 카탈로그' })
  catalog(): Promise<EventContextCatalogItem[]> {
    return this.service.getCatalog()
  }

  @Put(':eventId/context-links')
  @ApiOperation({ summary: '사건의 타 도메인 맥락 연결 목록 동기화' })
  sync(
    @Req() req: AuthedRequest,
    @Param('eventId') eventId: string,
    @Body() dto: SyncEventContextLinksDto,
  ): Promise<EventContextLinkView[]> {
    return this.service.sync(actorOf(req), eventId, dto.links)
  }
}
