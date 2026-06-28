import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { AuthGuard } from '@nestjs/passport'
import { ArtifactRarity } from '@prisma/client'
import {
  ArtifactService,
  type ArtifactView,
  type CollectArtifactResult,
  type UserArtifactView,
} from '../application/artifact.service'

/** 유물 구매 요청 */
export interface PurchaseArtifactDto {
  /** 구매할 Artifact ID */
  artifactId: string
  /** 멱등 키(중복 차감 방지) */
  requestId: string
}

/** 진열 토글 요청 */
export interface SetArtifactDisplayDto {
  /** 대상 UserArtifact ID */
  userArtifactId: string
  /** true=진열 / false=숨김 */
  displayed: boolean
}

@ApiTags('artifacts')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('artifacts')
export class ArtifactController {
  constructor(private readonly artifactService: ArtifactService) {}

  private actorId(req: any): string {
    return req.user?.userId ?? req.user?.id
  }

  @Get()
  @ApiOperation({ summary: '유물 카탈로그 (보유 플래그 + setKey/rarity 필터)' })
  async list(
    @Req() req: any,
    @Query('setKey') setKey?: string,
    @Query('rarity') rarity?: string,
  ): Promise<ArtifactView[]> {
    return this.artifactService.listArtifacts(this.actorId(req), {
      setKey: setKey && setKey !== '' ? setKey : undefined,
      rarity: isRarity(rarity) ? rarity : undefined,
    })
  }

  @Get('collection')
  @ApiOperation({ summary: '내 수집(진열장)' })
  async collection(@Req() req: any): Promise<UserArtifactView[]> {
    return this.artifactService.getMyCollection(this.actorId(req))
  }

  @Get('collection/:accountId')
  @ApiOperation({ summary: '방문: 타 계정 진열장(진열분만, 읽기전용)' })
  async visitedCollection(@Param('accountId') accountId: string): Promise<UserArtifactView[]> {
    return this.artifactService.getPublicCollection(accountId)
  }

  @Post('purchase')
  @ApiOperation({ summary: '유물 구매 (파피 소비, race-safe)' })
  async purchase(@Req() req: any, @Body() body: PurchaseArtifactDto): Promise<CollectArtifactResult> {
    return this.artifactService.purchaseArtifact(this.actorId(req), body.artifactId, body.requestId)
  }

  @Post('display')
  @ApiOperation({ summary: '유물 진열장 노출 토글' })
  async display(@Req() req: any, @Body() body: SetArtifactDisplayDto): Promise<UserArtifactView> {
    return this.artifactService.setDisplay(this.actorId(req), body.userArtifactId, body.displayed)
  }
}

/** 문자열이 유효한 ArtifactRarity인지 */
function isRarity(value: string | undefined): value is ArtifactRarity {
  return value != null && (Object.values(ArtifactRarity) as string[]).includes(value)
}
