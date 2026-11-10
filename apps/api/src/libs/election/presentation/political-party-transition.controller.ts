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
import { areJurisdictionsCompatible } from '../domain/law-jurisdiction.util'
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
    const fromParty = await this.ensureParty(body.fromPartyId)
    const toParty = await this.ensureParty(body.toPartyId)
    await this.assertPartiesCountryCompatible(fromParty, toParty)

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

    await this.assertNoLineageCycle(body.fromPartyId, body.toPartyId)
    const effectiveDate = this.parseOptionalDate(body.effectiveDate)

    let row
    try {
      row = await this.prisma.politicalPartyTransition.create({
        data: {
          fromPartyId: body.fromPartyId,
          toPartyId: body.toPartyId,
          kind: body.kind as any,
          effectiveDate: effectiveDate ?? undefined,
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
      data.effectiveDate = this.parseOptionalDate(body.effectiveDate)
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
    const existing = await this.prisma.politicalPartyTransition.findUnique({
      where: { id },
      select: { id: true },
    })
    if (!existing) throw new NotFoundException('계보 연결을 찾을 수 없습니다.')
    await this.prisma.politicalPartyTransition.delete({ where: { id } })
  }

  private async ensureParty(id: string) {
    const row = await this.prisma.politicalParty.findUnique({
      where: { id },
      select: { id: true, countryId: true, historicalCountryId: true },
    })
    if (!row) throw new NotFoundException('정당을 찾을 수 없습니다.')
    return row
  }

  private parseOptionalDate(raw: string | null | undefined): Date | null {
    if (raw == null || raw === '') return null
    const d = new Date(raw)
    if (Number.isNaN(d.getTime())) {
      throw new BadRequestException('날짜 형식이 올바르지 않습니다.')
    }
    return d
  }

  private async assertPartiesCountryCompatible(
    fromParty: { countryId: string | null; historicalCountryId: string | null },
    toParty: { countryId: string | null; historicalCountryId: string | null },
  ): Promise<void> {
    // 같은 현대 국가 소속이면(시대 전환 포함) 계보 연결 허용
    if (
      fromParty.countryId != null &&
      toParty.countryId != null &&
      fromParty.countryId === toParty.countryId
    ) {
      return
    }
    if (await areJurisdictionsCompatible(this.prisma, fromParty, toParty)) {
      return
    }
    // 두 역사적 국가 간 전환(또는 동일 현대국 브리지 공유)인 경우 허용
    if (
      fromParty.historicalCountryId != null &&
      toParty.historicalCountryId != null
    ) {
      if (this.prisma.historicalCountryTransition?.findFirst) {
        const directTransition =
          await this.prisma.historicalCountryTransition.findFirst({
            where: {
              OR: [
                {
                  predecessorId: fromParty.historicalCountryId,
                  successorId: toParty.historicalCountryId,
                },
                {
                  predecessorId: toParty.historicalCountryId,
                  successorId: fromParty.historicalCountryId,
                },
              ],
            },
            select: { id: true },
          })
        if (directTransition) return
      }
      if (this.prisma.historicalCountryModernCountry?.findMany) {
        const [fromBridges, toBridges] = await Promise.all([
          this.prisma.historicalCountryModernCountry.findMany({
            where: { historicalCountryId: fromParty.historicalCountryId },
            select: { modernCountryId: true },
          }),
          this.prisma.historicalCountryModernCountry.findMany({
            where: { historicalCountryId: toParty.historicalCountryId },
            select: { modernCountryId: true },
          }),
        ])
        const fromModernIds = new Set(fromBridges.map((b) => b.modernCountryId))
        if (toBridges.some((b) => fromModernIds.has(b.modernCountryId))) {
          return
        }
      }
    }
    throw new BadRequestException(
      '서로 다른 국가 소속의 정당 간에는 계보를 연결할 수 없습니다.',
    )
  }

  private async assertNoLineageCycle(
    fromPartyId: string,
    toPartyId: string,
  ): Promise<void> {
    if (!this.prisma.politicalPartyTransition?.findMany) return
    const visited = new Set<string>([toPartyId])
    let frontier = [toPartyId]
    while (frontier.length > 0) {
      const edges = await this.prisma.politicalPartyTransition.findMany({
        where: { fromPartyId: { in: frontier } },
        select: { toPartyId: true },
      })
      const next: string[] = []
      for (const edge of edges) {
        if (edge.toPartyId === fromPartyId) {
          throw new BadRequestException(
            '정당 계보에 순환(Cycle)이 발생하여 연결할 수 없습니다.',
          )
        }
        if (!visited.has(edge.toPartyId)) {
          visited.add(edge.toPartyId)
          next.push(edge.toPartyId)
        }
      }
      frontier = next
    }
  }
}
