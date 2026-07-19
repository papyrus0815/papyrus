import { Controller, Get, Param, UseGuards } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { AuthGuard } from '@nestjs/passport'
import { PersonService } from '../application/person.service'
import { PersonResponseDto } from './dto'

/**
 * 역사국가별 인물 조회 전용 컨트롤러 (경로 충돌 방지: persons/:id 와 분리)
 * GET /persons/by-historical-country/:historicalCountryId
 *
 * 현대판 GET /persons/by-country/:countryId 와 대칭인 3원 합집합
 * (본체 FK + 재임 + 소속). 검토서 F21.
 */
@ApiTags('persons')
@Controller('persons/by-historical-country')
@UseGuards(AuthGuard('jwt'))
export class PersonByHistoricalCountryController {
  constructor(private readonly personService: PersonService) {}

  @Get(':historicalCountryId')
  async getByHistoricalCountryId(
    @Param('historicalCountryId') historicalCountryId: string,
  ): Promise<PersonResponseDto[]> {
    return this.personService.findPersonsByHistoricalCountry(historicalCountryId)
  }
}
