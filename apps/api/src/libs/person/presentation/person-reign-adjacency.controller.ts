import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { ApiTags } from '@nestjs/swagger'
import { Request } from 'express'
import { PersonReignAdjacencyService } from '../application/person-reign-adjacency.service'
import { PersonReignAdjacencyResponseDto } from './dto/person-reign-adjacency.response'

/**
 * 인물 「같은 국가 전/후 재위(승계)」 컨트롤러.
 *
 * JWT 클래스 가드 — 무가드였던 government-positions 국가별 tenure GET 안티패턴을
 * 복제하지 않는다(동시대 수장 컨트롤러와 동일 체제). 대상 인물(:id)은 소유자 스코프,
 * 반환되는 선/후대 이웃 목록은 글로벌 읽기 — 의도된 혼합.
 */
@ApiTags('persons')
@Controller('persons')
@UseGuards(AuthGuard('jwt'))
export class PersonReignAdjacencyController {
  constructor(
    private readonly personReignAdjacencyService: PersonReignAdjacencyService,
  ) {}

  /**
   * 인물의 각 수장급 재임·재위 record별 같은 국가 선대·후대.
   * - `scope`: instance(기본, 정확 국가 인스턴스만) | succession(전이 그래프 확장 — B4)
   * - 창(fromYear/toYear) 파라미터 없음 — adjacency는 record startDate 인접이 정의.
   * - BC(연도<1) 앵커·국가 정보 없는 앵커는 계산 생략하고 meta 카운트로 노출(무성 절단 금지).
   */
  @Get(':id/reign-adjacency')
  async getReignAdjacency(
    @Param('id') id: string,
    @Req() req: Request,
    @Query('scope') scopeRaw?: string,
  ): Promise<PersonReignAdjacencyResponseDto> {
    let scope: 'instance' | 'succession' = 'instance'
    if (scopeRaw != null && scopeRaw !== '') {
      if (scopeRaw !== 'instance' && scopeRaw !== 'succession') {
        throw new BadRequestException('scope는 instance 또는 succession이어야 합니다')
      }
      scope = scopeRaw
    }

    const accountId = (req as any).user?.id ?? (req as any).user?.sub

    return this.personReignAdjacencyService.getReignAdjacency({
      personId: id,
      accountId,
      scope,
    })
  }
}
