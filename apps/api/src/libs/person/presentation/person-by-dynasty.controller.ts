import { Controller, Get, Param, UseGuards } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { AuthGuard } from '@nestjs/passport'
import { PersonService } from '../application/person.service'
import { PersonResponseDto } from './dto'

/**
 * 가문별 인물 조회 (경로 충돌 방지: persons/:id 와 분리)
 * GET /persons/by-dynasty/:dynastyId
 */
@ApiTags('persons')
@Controller('persons/by-dynasty')
@UseGuards(AuthGuard('jwt'))
export class PersonByDynastyController {
  constructor(private readonly personService: PersonService) {}

  @Get(':dynastyId')
  async getByDynastyId(
    @Param('dynastyId') dynastyId: string,
  ): Promise<PersonResponseDto[]> {
    return this.personService.findPersonsByDynasty(dynastyId)
  }
}
