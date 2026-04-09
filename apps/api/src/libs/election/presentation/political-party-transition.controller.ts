import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  NotFoundException,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { AuthGuard } from '@nestjs/passport'
import { Prisma } from '@prisma/client'
import { PrismaService } from '@prisma/prisma.service'
import { serializeElectionBigInt } from '../election-serialize.util'

export interface CreatePoliticalPartyTransitionBody {
  fromPartyId: string
  toPartyId: string
  kind: string
  effectiveDate?: string | null
  notes?: string | null
}

export interface UpdatePoliticalPartyTransitionBody {
  kind?: string
  effectiveDate?: string | null
  notes?: string | null
}

/**
 * 정당 전신·후신(계보) — 합당·분당은 여러 행으로 표현
 */
@ApiTags('political-party-transitions')
@Controller('political-party-transitions')
@UseGuards(AuthGuard('jwt'))
export class PoliticalPartyTransitionController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  async create(
    @Body()
    body: CreatePoliticalPartyTransitionBody,
  ): Promise<any> {
    if (body.fromPartyId === body.toPartyId) {
      throw new BadRequestException('출발 정당과 도착 정당은 달라야 합니다.')
    }
    await this.ensureParty(body.fromPartyId)
    await this.ensureParty(body.toPartyId)
    const dup = await this.prisma.politicalPartyTransition.findFirst({
      where: {
        fromPartyId: body.fromPartyId,
        toPartyId: body.toPartyId,
      },
    })
    if (dup) {
      throw new BadRequestException(
        '같은 방향의 계보 연결이 이미 있습니다. 목록에서 해당 행을 수정하거나 삭제한 뒤 다시 시도하세요.',
      )
    }
    let row
    try {
      row = await this.prisma.politicalPartyTransition.create({
      data: {
        fromPartyId: body.fromPartyId,
        toPartyId: body.toPartyId,
        kind: body.kind as any,
        effectiveDate: body.effectiveDate ? new Date(body.effectiveDate) : undefined,
        notes: body.notes ?? undefined,
      },
      include: {
        fromParty: { select: { id: true, name: true, shortName: true } },
        toParty: { select: { id: true, name: true, shortName: true } },
      },
    })
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new BadRequestException(
          '같은 방향의 계보 연결이 이미 있습니다. 목록에서 해당 행을 수정하거나 삭제한 뒤 다시 시도하세요.',
        )
      }
      throw e
    }
    return serializeElectionBigInt(row)
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body()
    body: UpdatePoliticalPartyTransitionBody,
  ): Promise<any> {
    const existing = await this.prisma.politicalPartyTransition.findUnique({
      where: { id },
    })
    if (!existing) throw new NotFoundException('계보 연결을 찾을 수 없습니다.')

    const data: {
      kind?: string
      effectiveDate?: Date | null
      notes?: string | null
    } = {}
    if (body.kind !== undefined) data.kind = body.kind
    if (body.effectiveDate !== undefined) {
      data.effectiveDate = body.effectiveDate
        ? new Date(body.effectiveDate)
        : null
    }
    if (body.notes !== undefined) data.notes = body.notes

    const row = await this.prisma.politicalPartyTransition.update({
      where: { id },
      data: data as any,
      include: {
        fromParty: { select: { id: true, name: true, shortName: true } },
        toParty: { select: { id: true, name: true, shortName: true } },
      },
    })
    return serializeElectionBigInt(row)
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<any> {
    await this.prisma.politicalPartyTransition.delete({ where: { id } })
  }

  private async ensureParty(id: string) {
    const row = await this.prisma.politicalParty.findUnique({ where: { id } })
    if (!row) throw new NotFoundException('정당을 찾을 수 없습니다.')
  }
}
