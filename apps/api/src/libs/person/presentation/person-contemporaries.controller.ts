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
import {
  PersonContemporariesService,
  PERSON_CONTEMPORARIES_DEFAULT_LIMIT,
  PERSON_CONTEMPORARIES_MAX_LIMIT,
} from '../application/person-contemporaries.service'
import { PersonContemporariesResponseDto } from './dto/person-contemporaries.response'

/** 부호 연도(BC 음수) 쿼리 파라미터 파싱 — person-records.controller와 동일 규칙 */
function parseSignedYear(raw: string | undefined, label: string): number | null {
  if (raw == null || raw === '') return null
  if (!/^-?\d{1,6}$/.test(raw)) {
    throw new BadRequestException(`${label}는 부호 있는 정수 연도여야 합니다`)
  }
  const year = Number.parseInt(raw, 10)
  // |year| > 9999는 DATETIME 표현 범위(및 utcYearStart의 setUTCFullYear)를 벗어나
  // Invalid Date로 Prisma에 새어 500이 되므로 여기서 명시적 400으로 막는다.
  if (Math.abs(year) > 9999) {
    throw new BadRequestException(`${label}는 -9999~9999 범위의 연도여야 합니다`)
  }
  return year
}

/**
 * 인물 동시대 수장 컨트롤러.
 *
 * JWT 클래스 가드 — 무가드였던 government-positions의 국가별 tenure GET
 * 안티패턴을 복제하지 않는다. 대상 인물(:id)은 소유자 스코프, 반환되는
 * 동시대 수장 목록은 글로벌 읽기(수장비교와 동일 체제) — 의도된 혼합.
 */
@ApiTags('persons')
@Controller('persons')
@UseGuards(AuthGuard('jwt'))
export class PersonContemporariesController {
  constructor(
    private readonly personContemporariesService: PersonContemporariesService,
  ) {}

  /**
   * 인물의 동시대 수장 목록.
   * - `fromYear`(포함)·`toYear`(배타): 부호 연도 — 함께 지정하거나 함께 생략.
   *   생략 시 대상 인물의 수장급 재임·재위 병합 구간에서 서버가 유도.
   * - `scope`: all(기본) | sameCountry(대상의 재임 국가 + 역사↔현대 브리지)
   * - `limit`: 인물 수 cap (기본 100, 최대 300) — 초과분은 meta.omittedCount
   */
  @Get(':id/contemporaries')
  async getContemporaries(
    @Param('id') id: string,
    @Req() req: Request,
    @Query('fromYear') fromYearRaw?: string,
    @Query('toYear') toYearRaw?: string,
    @Query('scope') scopeRaw?: string,
    @Query('limit') limitRaw?: string,
  ): Promise<PersonContemporariesResponseDto> {
    const fromYear = parseSignedYear(fromYearRaw, 'fromYear')
    const toYear = parseSignedYear(toYearRaw, 'toYear')
    // 쌍 검증은 여기서(DB·소유권 해석 이전) 결정론적 400을 반환한다 — 서비스에 미루면
    // 소유자 게이트 조회가 먼저 돌아 미소유 대상엔 404가 400을 가리고 불필요한 쿼리가 낭비된다.
    if ((fromYear == null) !== (toYear == null)) {
      throw new BadRequestException('fromYear·toYear는 함께 지정하거나 함께 생략해야 합니다')
    }
    if (fromYear != null && toYear != null && fromYear >= toYear) {
      throw new BadRequestException('fromYear는 toYear(배타)보다 작아야 합니다')
    }

    let scope: 'all' | 'sameCountry' = 'all'
    if (scopeRaw != null && scopeRaw !== '') {
      if (scopeRaw !== 'all' && scopeRaw !== 'sameCountry') {
        throw new BadRequestException('scope는 all 또는 sameCountry여야 합니다')
      }
      scope = scopeRaw
    }

    let limit = PERSON_CONTEMPORARIES_DEFAULT_LIMIT
    if (limitRaw != null && limitRaw !== '') {
      if (!/^\d{1,4}$/.test(limitRaw)) {
        throw new BadRequestException('limit은 양의 정수여야 합니다')
      }
      limit = Math.min(
        Math.max(Number.parseInt(limitRaw, 10), 1),
        PERSON_CONTEMPORARIES_MAX_LIMIT,
      )
    }

    const accountId = (req as any).user?.id ?? (req as any).user?.sub

    return this.personContemporariesService.getContemporaries({
      personId: id,
      accountId,
      fromYear,
      toYear,
      scope,
      limit,
    })
  }
}
