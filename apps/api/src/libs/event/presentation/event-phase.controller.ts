import {
  BadRequestException,
  Body,
  Controller,
  Param,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { PrismaClient } from '@prisma/client'

import { assertEventOwnership } from '../domain/event-ownership'
import { type EventPhaseDto, SyncEventPhasesDto } from './dto/event-phase.dto'

/** 국면 응답 행 — 상세 응답(EventResponseDto.phases)과 같은 모양 */
export function toEventPhaseDto(row: {
  id: string
  title: string
  order: number
  startEra: 'BC' | 'AD' | null
  startYear: number | null
  startMonth: number | null
  startDay: number | null
  endEra: 'BC' | 'AD' | null
  endYear: number | null
  endMonth: number | null
  endDay: number | null
  description: string | null
}): EventPhaseDto {
  return {
    id: row.id,
    title: row.title,
    order: row.order,
    startEra: row.startEra,
    startYear: row.startYear,
    startMonth: row.startMonth,
    startDay: row.startDay,
    endEra: row.endEra,
    endYear: row.endYear,
    endMonth: row.endMonth,
    endDay: row.endDay,
    description: row.description,
  }
}

/**
 * 국면 — 묶음 사건 안의 구획. 사건이 아니라 목차라서 별도 표(event_phase)에 둔다.
 * 국면을 묶음 사건으로 만들면 사건 목록·검색에 '2국면: …'이 사건처럼 섞이고 깊이가 한 단 늘었다.
 */
@ApiTags('events')
@ApiBearerAuth()
@Controller('events')
@UseGuards(AuthGuard('jwt'))
export class EventPhaseController {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * 국면 목록 동기화 — PUT /events/:eventId/phases
   * 배열 전체를 보낸다(순서 = 표시 순서). id가 있으면 고치고, 없으면 만들고, 빠진 국면은 지운다
   * (그 국면에 손으로 넣었던 하위 사건은 FK SetNull로 '날짜로 자동'으로 돌아간다).
   * @tag events
   */
  @Put(':eventId/phases')
  async sync(
    @Req() req: { user?: { id?: string; sub?: string } },
    @Param('eventId') eventId: string,
    @Body() body: SyncEventPhasesDto,
  ): Promise<EventPhaseDto[]> {
    await assertEventOwnership(this.prisma, eventId, req.user?.id ?? req.user?.sub, {
      action: '수정',
      deleted: 'conflict',
    })
    const existing = await this.prisma.eventPhase.findMany({ where: { eventId }, select: { id: true } })
    const existingIds = new Set(existing.map((row) => row.id))
    for (const phase of body.phases) {
      if (phase.id && !existingIds.has(phase.id)) {
        throw new BadRequestException('다른 사건의 국면이거나 없는 국면입니다')
      }
    }
    const keepIds = new Set(body.phases.map((phase) => phase.id).filter((id): id is string => Boolean(id)))

    await this.prisma.$transaction(async (tx) => {
      const removed = [...existingIds].filter((id) => !keepIds.has(id))
      if (removed.length > 0) await tx.eventPhase.deleteMany({ where: { id: { in: removed } } })
      for (const [index, phase] of body.phases.entries()) {
        const data = {
          title: phase.title.trim(),
          order: index,
          startEra: phase.startYear != null ? (phase.startEra ?? 'AD') : null,
          startYear: phase.startYear ?? null,
          startMonth: phase.startYear != null ? (phase.startMonth ?? null) : null,
          startDay: phase.startYear != null && phase.startMonth != null ? (phase.startDay ?? null) : null,
          endEra: phase.endYear != null ? (phase.endEra ?? 'AD') : null,
          endYear: phase.endYear ?? null,
          endMonth: phase.endYear != null ? (phase.endMonth ?? null) : null,
          endDay: phase.endYear != null && phase.endMonth != null ? (phase.endDay ?? null) : null,
          description: phase.description?.trim() || null,
        }
        if (phase.id) await tx.eventPhase.update({ where: { id: phase.id }, data })
        else await tx.eventPhase.create({ data: { ...data, eventId } })
      }
    })

    const rows = await this.prisma.eventPhase.findMany({
      where: { eventId },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    })
    return rows.map(toEventPhaseDto)
  }
}
