import {
  Controller,
  Delete,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
} from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { PersonService } from '../application/person.service'
import {
  CreateGovernmentPositionTenureDto,
  CreateGovernmentPositionDefinitionDto,
  CreateTenureAchievementDto,
  UpdateGovernmentPositionDefinitionDto,
} from './dto'

const serializeBigInt = (obj: any): any => {
  if (obj === null || obj === undefined) return obj
  if (typeof obj === 'bigint') return obj.toString()
  if (obj instanceof Date) return obj.toISOString()
  if (Array.isArray(obj)) return obj.map(serializeBigInt)
  if (typeof obj === 'object') {
    const result: any = {}
    for (const key in obj) result[key] = serializeBigInt(obj[key])
    return result
  }
  return obj
}

/**
 * 정부 직위/왕위 관리 컨트롤러
 */
@ApiTags('government-positions')
@Controller('government-positions')
export class GovernmentPositionController {
  constructor(private readonly personService: PersonService) {}

  /**
   * 현대 국가별 재임 기록 (REST) - GET /government-positions/countries/:countryId/tenures
   */
  @Get('countries/:countryId/tenures')
  async getTenuresByCountryId(@Param('countryId') countryId: string): Promise<any[]> {
    const list = await this.personService.findTenuresByCountry({ countryId })
    return list.map(serializeBigInt)
  }

  /**
   * 현대 국가에 재임이 있는 인물 (REST) - GET /government-positions/countries/:countryId/persons
   */
  @Get('countries/:countryId/persons')
  async getPersonsByCountryId(@Param('countryId') countryId: string): Promise<any[]> {
    return this.personService.findPersonsWithTenureInCountry({ countryId })
  }

  /**
   * 역사적 국가별 재임 기록 (REST) - GET /government-positions/historical-countries/:id/tenures
   */
  @Get('historical-countries/:historicalCountryId/tenures')
  async getTenuresByHistoricalCountryId(
    @Param('historicalCountryId') historicalCountryId: string,
  ): Promise<any[]> {
    const list = await this.personService.findTenuresByCountry({
      historicalCountryId,
    })
    return list.map(serializeBigInt)
  }

  /**
   * 역사적 국가에 재임이 있는 인물 (REST) - GET /government-positions/historical-countries/:id/persons
   */
  @Get('historical-countries/:historicalCountryId/persons')
  async getPersonsByHistoricalCountryId(
    @Param('historicalCountryId') historicalCountryId: string,
  ): Promise<any[]> {
    return this.personService.findPersonsWithTenureInCountry({
      historicalCountryId,
    })
  }

  /**
   * 관직 정의 목록 조회 (전역 단일 레벨)
   */
  @Get('definitions')
  async getDefinitions(
    @Query('countryId') countryId?: string,
    @Query('historicalCountryId') historicalCountryId?: string,
  ): Promise<any[]> {
    const list = await this.personService.findPositionDefinitions({
      countryId: countryId || undefined,
      historicalCountryId: historicalCountryId || undefined,
    })
    return list.map(serializeBigInt)
  }

  /**
   * 관직 정의 단건 조회
   */
  @Get('definitions/:id')
  async getDefinitionById(@Param('id') id: string): Promise<any> {
    const def = await this.personService.findPositionDefinitionById(id)
    return serializeBigInt(def)
  }

  /**
   * 관직 정의 생성
   */
  @Post('definitions')
  async createDefinition(
    @Body() dto: CreateGovernmentPositionDefinitionDto,
  ): Promise<any> {
    const def = await this.personService.createPositionDefinition(dto)
    return serializeBigInt(def)
  }

  /**
   * 관직 정의 수정
   */
  @Put('definitions/:id')
  async updateDefinition(
    @Param('id') id: string,
    @Body() dto: UpdateGovernmentPositionDefinitionDto,
  ): Promise<any> {
    const def = await this.personService.updatePositionDefinition(id, dto)
    return serializeBigInt(def)
  }

  /**
   * 관직 정의 삭제
   */
  @Delete('definitions/:id')
  async deleteDefinition(@Param('id') id: string): Promise<void> {
    await this.personService.deletePositionDefinition(id)
  }

  /**
   * 국가원수/왕위 재임 기록 추가
   */
  @Post('tenures')
  async addTenure(@Body() dto: CreateGovernmentPositionTenureDto): Promise<any> {
    const result = await this.personService.addGovernmentPositionTenure(dto)
    return serializeBigInt(result)
  }

  /**
   * 국가원수/왕위 재임 기록 수정
   */
  @Put('tenures/:id')
  async updateTenure(
    @Param('id') id: string,
    @Body() dto: Partial<CreateGovernmentPositionTenureDto>
  ): Promise<any> {
    const result = await this.personService.updateGovernmentPositionTenure(id, dto)
    return serializeBigInt(result)
  }

  /**
   * 국가원수/왕위 재임 기록 삭제
   */
  @Delete('tenures/:id')
  async deleteTenure(@Param('id') id: string): Promise<void> {
    await this.personService.deleteGovernmentPositionTenure(id)
  }

  /**
   * 재임 업적·한일 추가 (사건과 별도 개념, 재위 기간 중 한 일)
   */
  @Post('tenures/:tenureId/achievements')
  async addTenureAchievement(
    @Param('tenureId') tenureId: string,
    @Body() dto: CreateTenureAchievementDto,
  ): Promise<any> {
    const result = await this.personService.createTenureAchievement(tenureId, dto)
    return serializeBigInt(result)
  }

  /**
   * 사건 페이지(연대표)에 표시할 업적 목록 (showOnEventsPage=true)
   */
  @Get('achievements/for-events-page')
  async getAchievementsForEventsPage(): Promise<any[]> {
    const list = await this.personService.findAchievementsForEventsPage()
    return list.map(serializeBigInt)
  }

  /**
   * 재임 업적 삭제
   */
  @Delete('tenures/:tenureId/achievements/:achievementId')
  async deleteTenureAchievement(
    @Param('tenureId') tenureId: string,
    @Param('achievementId') achievementId: string,
  ): Promise<void> {
    await this.personService.deleteTenureAchievement(tenureId, achievementId)
  }
}
