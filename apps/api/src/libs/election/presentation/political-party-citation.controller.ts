/**
 * 정당 기록의 출처 — 정당 본체와 곁가지 9종 각 행에 인용을 단다(B5, docs/political-party-model-review.md §4.11).
 *
 * 쓰기는 근거 도메인의 CitationService.sync 하나로 — 자연키(출처·위치) 머지라 사람이 다듬은 근거 구절이 보존된다.
 * 수치(당원 수 등)는 여기가 아니라 /observations(subjectType=POLITICAL_PARTY)에, 그 수치의 출처도 거기서 단다.
 */
import { Body, Controller, Get, NotFoundException, Param, Put, Req, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { ApiTags } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsArray, IsNotEmpty, IsString, ValidateNested } from 'class-validator'

import { PrismaService } from '@prisma/prisma.service'

import { CitationService, type CitationView } from '../../evidence/application/citation.service'
import { CitationInputDto } from '../../evidence/presentation/dto/evidence.dto'
import { assertPartyCitationTarget, partyCitationTargetIds } from '../domain/party-evidence.util'

/** 전역 검증 파이프가 인용·새 출처 칸까지 검사하도록 클래스로(근거 도메인의 CitationInputDto 그대로) */
export class SetPartyCitationsDto {
  /** POLITICAL_PARTY · PARTY_ALIAS · PARTY_LEGAL_STATUS · PARTY_IDEOLOGY · PARTY_POSITION_PERIOD · PARTY_ORGANIZATION · PARTY_MEMBERSHIP · PARTY_SYMBOL · PARTY_EXPRESSION · PARTY_HEADQUARTERS */
  @IsString()
  @IsNotEmpty()
  targetType!: string

  @IsString()
  @IsNotEmpty()
  targetId!: string

  /** 배열 순서 = 표시 순서. 기존 출처(sourceId) 또는 새 출처(source) */
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CitationInputDto)
  citations!: CitationInputDto[]
}

export interface PartyCitationGroup {
  targetType: string
  targetId: string
  citations: CitationView[]
}

interface AuthedRequest {
  user?: { id?: string; sub?: string }
}

@ApiTags('political-parties')
@Controller('political-parties')
@UseGuards(AuthGuard('jwt'))
export class PoliticalPartyCitationController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly citations: CitationService,
  ) {}

  /** 정당 전체의 인용 — 대상별로 묶어 한 번에(각 행의 '출처 N' 표시용) */
  @Get(':id/citations')
  async list(@Param('id') partyId: string): Promise<PartyCitationGroup[]> {
    await this.ensureParty(partyId)
    const targets = await partyCitationTargetIds(this.prisma, partyId)
    const groups: PartyCitationGroup[] = []
    for (const [targetType, ids] of targets) {
      const byTarget = await this.citations.listForTargets(this.prisma, targetType, ids)
      for (const [targetId, list] of byTarget) groups.push({ targetType, targetId, citations: list })
    }
    return groups
  }

  /** 한 대상의 인용을 요청과 같게 — 빈 배열이면 모두 뗀다 */
  @Put(':id/citations')
  async set(
    @Req() req: AuthedRequest,
    @Param('id') partyId: string,
    @Body() body: SetPartyCitationsDto,
  ): Promise<PartyCitationGroup> {
    await this.ensureParty(partyId)
    const targetType = await assertPartyCitationTarget(this.prisma, partyId, body.targetType, body.targetId)
    const actorId = req.user?.id ?? req.user?.sub ?? ''
    await this.prisma.$transaction((tx) =>
      this.citations.sync(tx, targetType, body.targetId, body.citations, actorId),
    )
    const byTarget = await this.citations.listForTargets(this.prisma, targetType, [body.targetId])
    return { targetType, targetId: body.targetId, citations: byTarget.get(body.targetId) ?? [] }
  }

  private async ensureParty(partyId: string): Promise<void> {
    const party = await this.prisma.politicalParty.findUnique({ where: { id: partyId }, select: { id: true } })
    if (!party) throw new NotFoundException('정당을 찾을 수 없습니다.')
  }
}
