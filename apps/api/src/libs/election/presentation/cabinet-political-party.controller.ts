import {
  BadRequestException,
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

export interface CreateCabinetPoliticalPartyBody {
  partyId: string
  role: string
  notes?: string | null
  provenance?: string
  electionPartyResultId?: string | null
}

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
  async list(@Param('cabinetId') cabinetId: string, @Req() req: Request): Promise<any> {
    await this.ensureCabinetAccess(cabinetId, req)
    const rows = await this.prisma.cabinetPoliticalParty.findMany({
      where: { cabinetId },
      include: {
        party: { select: { id: true, name: true, shortName: true } },
        electionPartyResult: {
          include: {
            election: {
              select: { id: true, name: true, pollDate: true },
            },
          },
        },
      },
      orderBy: { role: 'asc' },
    })
    return serializeElectionBigInt(rows)
  }

  @Post(':cabinetId/political-parties')
  async create(
    @Param('cabinetId') cabinetId: string,
    @Req() req: Request,
    @Body()
    body: CreateCabinetPoliticalPartyBody,
  ): Promise<any> {
    await this.ensureCabinetAccess(cabinetId, req)

    const cabinet = await this.prisma.cabinet.findUnique({
      where: { id: cabinetId },
      include: {
        headTenure: {
          select: { countryId: true, historicalCountryId: true },
        },
      },
    })
    if (!cabinet) {
      throw new NotFoundException('행정부를 찾을 수 없습니다.')
    }

    let provenance: 'MANUAL' | 'FROM_ELECTION_PARTY_RESULT' | 'FROM_HEAD_CANDIDACY' | 'OTHER' =
      'MANUAL'
    let electionPartyResultId: string | null | undefined = undefined

    if (body.electionPartyResultId) {
      const epr = await this.prisma.electionPartyResult.findUnique({
        where: { id: body.electionPartyResultId },
        include: { election: true },
      })
      if (!epr) {
        throw new BadRequestException('선거 정당 집계를 찾을 수 없습니다.')
      }
      if (epr.partyId !== body.partyId) {
        throw new BadRequestException('선거 집계와 선택한 정당이 일치하지 않습니다.')
      }
      const taken = await this.prisma.cabinetPoliticalParty.findFirst({
        where: { electionPartyResultId: body.electionPartyResultId },
      })
      if (taken) {
        throw new BadRequestException('이 선거 집계는 이미 다른 행정부와 연결되어 있습니다.')
      }

      const ec = epr.election
      const ht = cabinet.headTenure
      const hasElectionScope = ec.countryId != null || ec.historicalCountryId != null
      if (hasElectionScope && ht) {
        const match =
          (ec.countryId != null && ec.countryId === ht.countryId) ||
          (ec.historicalCountryId != null &&
            ec.historicalCountryId === ht.historicalCountryId)
        if (!match) {
          throw new BadRequestException(
            '선거 소속 국가가 이 행정부 수반 재임과 맞지 않습니다.',
          )
        }
      }

      provenance = 'FROM_ELECTION_PARTY_RESULT'
      electionPartyResultId = body.electionPartyResultId
    } else if (body.provenance && ['MANUAL', 'FROM_HEAD_CANDIDACY', 'OTHER'].includes(body.provenance)) {
      provenance = body.provenance as any
    }

    const row = await this.prisma.cabinetPoliticalParty.create({
      data: {
        cabinetId,
        partyId: body.partyId,
        role: body.role as any,
        notes: body.notes ?? undefined,
        provenance: provenance as any,
        ...(electionPartyResultId != null && { electionPartyResultId }),
      },
      include: {
        party: { select: { id: true, name: true, shortName: true } },
        electionPartyResult: {
          include: {
            election: {
              select: { id: true, name: true, pollDate: true },
            },
          },
        },
      },
    })
    return serializeElectionBigInt(row)
  }

  @Delete(':cabinetId/political-parties/:linkId')
  async remove(
    @Param('cabinetId') cabinetId: string,
    @Param('linkId') linkId: string,
    @Req() req: Request,
  ): Promise<any> {
    await this.ensureCabinetAccess(cabinetId, req)
    const existing = await this.prisma.cabinetPoliticalParty.findFirst({
      where: { id: linkId, cabinetId },
    })
    if (!existing) throw new NotFoundException('연결 정보를 찾을 수 없습니다.')
    await this.prisma.cabinetPoliticalParty.delete({ where: { id: linkId } })
  }
}
