import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { AuthGuard } from '@nestjs/passport'
import { PrismaService } from '@prisma/prisma.service'
import { Request } from 'express'
import { serializeElectionBigInt } from '../election-serialize.util'

/**
 * 행정부(Cabinet)와 정당의 연정·여당 관계
 * 경로: /government-positions/cabinets/...
 */
@ApiTags('government-positions')
@Controller('government-positions/cabinets')
@UseGuards(AuthGuard('jwt'))
export class CabinetPoliticalPartyController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * `PersonRepository`의 행정부 접근 규칙과 동일:
   * - `Cabinet.accountId`가 null이면(레거시·공용) 로그인 사용자는 접근 가능
   * - 값이 있으면 현재 계정과 일치할 때만 허용
   */
  private async ensureCabinetAccess(cabinetId: string, req: Request) {
    const accountId = (req as any).user?.id ?? (req as any).user?.sub
    if (!accountId) throw new UnauthorizedException()
    const cabinet = await this.prisma.cabinet.findUnique({
      where: { id: cabinetId },
      select: { id: true, accountId: true },
    })
    if (!cabinet) {
      throw new NotFoundException('행정부를 찾을 수 없거나 권한이 없습니다.')
    }
    if (
      cabinet.accountId != null &&
      cabinet.accountId !== String(accountId)
    ) {
      throw new NotFoundException('행정부를 찾을 수 없거나 권한이 없습니다.')
    }
  }

  @Get(':cabinetId/political-parties')
  async list(@Param('cabinetId') cabinetId: string, @Req() req: Request) {
    await this.ensureCabinetAccess(cabinetId, req)
    const rows = await this.prisma.cabinetPoliticalParty.findMany({
      where: { cabinetId },
      include: {
        party: { select: { id: true, name: true, shortName: true } },
      },
      orderBy: { role: 'asc' },
    })
    return serializeElectionBigInt(rows)
  }

  @Post(':cabinetId/political-parties')
  async create(
    @Param('cabinetId') cabinetId: string,
    @Req() req: Request,
    @Body() body: { partyId: string; role: string; notes?: string | null },
  ) {
    await this.ensureCabinetAccess(cabinetId, req)
    const row = await this.prisma.cabinetPoliticalParty.create({
      data: {
        cabinetId,
        partyId: body.partyId,
        role: body.role as any,
        notes: body.notes ?? undefined,
      },
      include: {
        party: { select: { id: true, name: true, shortName: true } },
      },
    })
    return serializeElectionBigInt(row)
  }

  @Delete(':cabinetId/political-parties/:linkId')
  async remove(
    @Param('cabinetId') cabinetId: string,
    @Param('linkId') linkId: string,
    @Req() req: Request,
  ) {
    await this.ensureCabinetAccess(cabinetId, req)
    const existing = await this.prisma.cabinetPoliticalParty.findFirst({
      where: { id: linkId, cabinetId },
    })
    if (!existing) throw new NotFoundException('연결 정보를 찾을 수 없습니다.')
    await this.prisma.cabinetPoliticalParty.delete({ where: { id: linkId } })
  }
}
