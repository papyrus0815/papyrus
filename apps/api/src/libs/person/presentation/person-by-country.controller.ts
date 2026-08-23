import { Controller, Get, Param, UseGuards } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { AuthGuard } from '@nestjs/passport'
import { PersonService } from '../application/person.service'
import { PersonResponseDto } from './dto'

/**
 * 국가별 인물 조회 전용 컨트롤러 (경로 충돌 방지: persons/:id 와 분리)
 * - GET /persons/by-country/:countryId          평면 목록(현대 축 3원 합집합)
 * - GET /persons/by-country/:countryId/grouped  현대 + 연결된 과거국가별 묶음
 */

/** 국가 상세 인물 탭 응답 — 현대 축과 과거국가별 묶음을 나눠 담는다. */
export class CountryPersonGroupDto {
  historicalCountryId!: string
  historicalCountryName!: string
  persons!: PersonResponseDto[]
}

export class CountryPersonsGroupedDto {
  /** 이 현대 국가 소속 인물 (과거국가에도 걸린 인물은 제외 — 역사 우선) */
  modern!: PersonResponseDto[]
  /** 연결된 과거 국가별 인물. 인물이 0명인 과거국가는 담지 않는다 */
  historical!: CountryPersonGroupDto[]
}
@ApiTags('persons')
@Controller('persons/by-country')
@UseGuards(AuthGuard('jwt'))
export class PersonByCountryController {
  constructor(private readonly personService: PersonService) {}

  /**
   * 국가 상세 "인물" 탭 — 현대 국가 인물과 연결된 과거국가 인물을 한 번에.
   * `:countryId` 아래 정적 세그먼트라 `:countryId` 단독 라우트보다 **먼저** 선언한다.
   */
  @Get(':countryId/grouped')
  async getByCountryIdGrouped(
    @Param('countryId') countryId: string,
  ): Promise<CountryPersonsGroupedDto> {
    return this.personService.findPersonsByCountryGrouped(countryId)
  }

  @Get(':countryId')
  async getByCountryId(
    @Param('countryId') countryId: string,
  ): Promise<PersonResponseDto[]> {
    return this.personService.findPersonsByCountry(countryId)
  }
}
