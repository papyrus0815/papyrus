import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { ApiProperty, ApiTags } from '@nestjs/swagger'
import { IsOptional, IsString, MaxLength } from 'class-validator'
import { Request } from 'express'

import {
  PersonEventCandidatesDto,
  PersonEventLinkDto,
  PersonEventLinkService,
} from '../application/person-event-link.service'

/** 인물↔사건 연결 본문 — 둘 다 선택(빈 문자열은 비움) */
export class LinkPersonEventDto {
  @ApiProperty({ description: '이 사건에서의 역할(예: 지휘관)', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  role?: string | null

  @ApiProperty({ description: '비고', required: false })
  @IsOptional()
  @IsString()
  note?: string | null
}

type AuthedRequest = Request & { user?: { id?: string; sub?: string } }

const accountIdOf = (req: Request): string => {
  const user = (req as AuthedRequest).user
  return user?.id ?? user?.sub ?? ''
}

/**
 * 인물 쪽에서 사건 참여를 잇고 끊는다 — 사건 상세의 '참여 인물'과 같은 표(person_event).
 */
@ApiTags('persons')
@Controller('persons')
@UseGuards(AuthGuard('jwt'))
export class PersonEventLinkController {
  constructor(private readonly personEventLinkService: PersonEventLinkService) {}

  /**
   * 연결 후보 — `q`가 있으면 제목 검색, 없으면 인물의 나라·생애로 고른 추천.
   * 이미 연결된 사건은 늘 맨 위에 `linked: true`로 함께 온다.
   * @tag persons
   */
  @Get(':personId/event-candidates')
  async getEventCandidates(
    @Param('personId') personId: string,
    @Req() req: Request,
    @Query('q') query?: string,
  ): Promise<PersonEventCandidatesDto> {
    return this.personEventLinkService.getCandidates(personId, accountIdOf(req), query)
  }

  /**
   * 사건 연결(멱등) — 없으면 만들고 있으면 역할·비고만 바꾼다.
   * @tag persons
   */
  @Put(':personId/events/:eventId')
  async linkEvent(
    @Param('personId') personId: string,
    @Param('eventId') eventId: string,
    @Req() req: Request,
    @Body() body: LinkPersonEventDto,
  ): Promise<PersonEventLinkDto> {
    return this.personEventLinkService.link(personId, eventId, accountIdOf(req), body)
  }

  /**
   * 사건 연결 해제(멱등).
   * @tag persons
   */
  @Delete(':personId/events/:eventId')
  async unlinkEvent(
    @Param('personId') personId: string,
    @Param('eventId') eventId: string,
    @Req() req: Request,
  ): Promise<{ success: true }> {
    await this.personEventLinkService.unlink(personId, eventId, accountIdOf(req))
    return { success: true }
  }
}
