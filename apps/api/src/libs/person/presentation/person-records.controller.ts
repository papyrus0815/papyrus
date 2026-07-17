import {
  BadRequestException,
  Controller,
  Get,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { ApiTags } from '@nestjs/swagger'
import { Request } from 'express'
import {
  PersonRecordsService,
  PERSON_RECORDS_COMPARE_MAX_PERSONS,
} from '../application/person-records.service'
import {
  PersonRecordKind,
  PersonRecordsCompareResponseDto,
} from './dto/person-records-compare.response'

const VALID_SOURCES: PersonRecordKind[] = [
  'LIFE_EVENT',
  'TENURE',
  'REIGN',
  'ACHIEVEMENT',
  'EVENT',
  'AWARD',
]

/** 부호 연도(BC 음수) 쿼리 파라미터 파싱. 빈 값은 null, 형식 오류는 400 */
function parseSignedYear(raw: string | undefined, label: string): number | null {
  if (raw == null || raw === '') return null
  if (!/^-?\d{1,6}$/.test(raw)) {
    throw new BadRequestException(`${label}는 부호 있는 정수 연도여야 합니다`)
  }
  return Number.parseInt(raw, 10)
}

/**
 * 인물 통합 기록 비교 컨트롤러.
 *
 * 인물 상세의 채널별 저작(연보·재임·업적·사건·수상)은 그대로 두고,
 * "여러 인물이 같은 시대에 무엇을 했는가"를 한 번의 호출로 답하는 읽기 전용 API.
 * (검토서 docs/person-record-convergence-era-compare-review.md 1단계)
 */
@ApiTags('person-records')
@Controller('person-records')
export class PersonRecordsController {
  constructor(private readonly personRecordsService: PersonRecordsService) {}

  /**
   * 인물별 통합 기록 비교.
   * - `personIds`: 콤마 구분, 필수, 최대 12명
   * - `fromYear`(포함)·`toYear`(배타): 부호 연도(BC 음수), 선택
   * - `sources`: 콤마 구분 채널 필터(LIFE_EVENT|TENURE|REIGN|ACHIEVEMENT|EVENT|AWARD), 선택
   * - 연보(LIFE_EVENT)는 요청 계정 본인 등록분만 반환한다 (meta.lifeEventScope)
   */
  @UseGuards(AuthGuard('jwt'))
  @Get('compare')
  async compare(
    @Req() req: Request,
    @Query('personIds') personIdsRaw?: string,
    @Query('fromYear') fromYearRaw?: string,
    @Query('toYear') toYearRaw?: string,
    @Query('sources') sourcesRaw?: string,
  ): Promise<PersonRecordsCompareResponseDto> {
    const personIds = (personIdsRaw ?? '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
    if (personIds.length === 0) {
      throw new BadRequestException('personIds가 필요합니다 (콤마 구분)')
    }
    if (new Set(personIds).size > PERSON_RECORDS_COMPARE_MAX_PERSONS) {
      throw new BadRequestException(
        `personIds는 최대 ${PERSON_RECORDS_COMPARE_MAX_PERSONS}개까지 지원합니다`,
      )
    }

    const fromYear = parseSignedYear(fromYearRaw, 'fromYear')
    const toYear = parseSignedYear(toYearRaw, 'toYear')
    if (fromYear != null && toYear != null && fromYear >= toYear) {
      throw new BadRequestException('fromYear는 toYear(배타)보다 작아야 합니다')
    }

    let sources: PersonRecordKind[] | null = null
    if (sourcesRaw) {
      const requested = sourcesRaw
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean)
      const invalid = requested.filter(
        (value) => !VALID_SOURCES.includes(value as PersonRecordKind),
      )
      if (invalid.length > 0) {
        throw new BadRequestException(`알 수 없는 sources: ${invalid.join(', ')}`)
      }
      sources = requested as PersonRecordKind[]
    }

    const accountId = (req as any).user?.id ?? (req as any).user?.sub

    return this.personRecordsService.compare({
      personIds,
      fromYear,
      toYear,
      sources,
      accountId,
    })
  }
}
