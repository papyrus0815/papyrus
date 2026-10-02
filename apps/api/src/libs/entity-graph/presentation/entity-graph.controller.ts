import { BadRequestException, Controller, Get, Param, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { ApiTags } from '@nestjs/swagger'

import { getActorAccountId } from '../../shared/actor-context'
import { EntityGraphService } from '../application/entity-graph.service'
import { isEntityKind } from '../domain/entity-graph.types'
import type { EntityConnectionsResponseDto } from './dto/entity-connections.response'

/**
 * 엔티티 연결 그래프 — 어떤 엔티티든 이어진 모든 엔티티를 양방향으로.
 * 설계: docs/entity-graph-design.md
 */
@ApiTags('entity-graph')
@Controller('entity-graph')
@UseGuards(AuthGuard('jwt'))
export class EntityGraphController {
  constructor(private readonly entityGraphService: EntityGraphService) {}

  /**
   * 엔티티의 연결 목록.
   * - kind: person | event | country | historicalCountry | dynasty | organization | treaty |
   *   militaryUnit | politicalParty | personGroup
   * - 인물·사건 주어는 소유자 범위(미소유 404). 결과의 인물·사건은 accessible로 표시.
   */
  @Get(':kind/:id/connections')
  async getConnections(
    @Param('kind') kind: string,
    @Param('id') id: string,
  ): Promise<EntityConnectionsResponseDto> {
    if (!isEntityKind(kind)) {
      throw new BadRequestException(`지원하지 않는 kind입니다: ${kind}`)
    }
    return this.entityGraphService.connections(kind, id, getActorAccountId())
  }
}
