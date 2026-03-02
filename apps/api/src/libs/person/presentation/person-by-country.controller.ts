import { Controller, Get, Param, UseGuards } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { AuthGuard } from '@nestjs/passport'
import { PersonService } from '../application/person.service'
import { PersonResponseDto } from './dto'

/**
 * 국가별 인물 조회 전용 컨트롤러 (경로 충돌 방지: persons/:id 와 분리)
 * GET /persons/by-country/:countryId
 */
@ApiTags('persons')
@Controller('persons/by-country')
@UseGuards(AuthGuard('jwt'))
export class PersonByCountryController {
  constructor(private readonly personService: PersonService) {}

  @Get(':countryId')
  async getByCountryId(
    @Param('countryId') countryId: string,
  ): Promise<PersonResponseDto[]> {
    return this.personService.findPersonsByCountry(countryId)
  }
}
