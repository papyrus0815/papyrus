import {
  Controller,
  Delete,
  Get,
  NotFoundException,
  Patch,
  Post,
  Put,
  Body,
  Param,
  Query,
  Req,
} from '@nestjs/common'
import { Request } from 'express'
import { ApiTags } from '@nestjs/swagger'
import { PersonService } from '../application/person.service'
import {
  CreateGovernmentPositionTenureDto,
  CreateGovernmentPositionDefinitionDto,
  CreateTenureAchievementDto,
  UpdateTenureAchievementDto,
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
   * 전역 수반(교황 등) 재임 기록 — 국가에 속하지 않는 직책
   */
  @Get('global/tenures')
  async getGlobalTenures(): Promise<any[]> {
    const list = await this.personService.findGlobalTenures()
    return list.map(serializeBigInt)
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
   * 인물별 선거 후보 목록 — 재임에 당선 선거(ElectionCandidacy) 연결 시 선택용
   */
  @Get('tenures/election-candidacy-options')
  async getElectionCandidacyOptionsForTenure(
    @Query('personId') personId: string,
  ): Promise<any[]> {
    const id = personId?.trim()
    if (!id) return []
    const list = await this.personService.findElectionCandidaciesForTenureLink(id)
    return list.map(serializeBigInt)
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
   * 특정 수반 재임 하의 각료 목록 (행정부 한눈에 보기) — headTenureId로 Cabinet 조회 후 멤버 반환
   */
  @Get('tenures/by-parent/:parentTenureId')
  async getSubordinateTenures(@Param('parentTenureId') parentTenureId: string): Promise<any[]> {
    const list = await this.personService.findSubordinateTenures(parentTenureId)
    return list.map(serializeBigInt)
  }

  /**
   * 행정부(Cabinet) 목록 — 국가/역사적 국가별. 로그인 시 해당 계정이 등록한 행정부만 반환.
   */
  @Get('cabinets')
  async getCabinets(
    @Req() req: Request,
    @Query('countryId') countryId?: string,
    @Query('historicalCountryId') historicalCountryId?: string,
  ): Promise<any[]> {
    const accountId = (req as any).user?.id ?? (req as any).user?.sub
    const list = await this.personService.findCabinets({
      countryId,
      historicalCountryId,
      accountId,
    })
    return list.map(serializeBigInt)
  }

  /**
   * 행정부 등록 — 수반 재임을 지정해 행정부 생성. 로그인 시 현재 계정 소유로 저장.
   */
  @Post('cabinets')
  async createCabinet(
    @Req() req: Request,
    @Body()
    body: {
      headTenureId: string
      name?: string | null
    },
  ): Promise<any> {
    const accountId = (req as any).user?.id ?? (req as any).user?.sub
    const cabinet = await this.personService.createCabinet(body, accountId)
    return serializeBigInt(cabinet)
  }

  /**
   * 수반 재임 ID로 행정부 1건 조회 (해당 수반이 수장인 행정부)
   */
  @Get('cabinets/by-head-tenure/:headTenureId')
  async getCabinetByHeadTenure(@Param('headTenureId') headTenureId: string): Promise<any | null> {
    const cabinet = await this.personService.findCabinetByHeadTenureId(headTenureId)
    return cabinet ? serializeBigInt(cabinet) : null
  }

  /**
   * 행정부 수정 (이름 등)
   */
  @Patch('cabinets/:cabinetId')
  async updateCabinet(
    @Req() req: Request,
    @Param('cabinetId') cabinetId: string,
    @Body() body: { name?: string | null },
  ): Promise<any> {
    const accountId = (req as any).user?.id ?? (req as any).user?.sub
    const cabinet = await this.personService.updateCabinet(cabinetId, body, accountId)
    if (!cabinet) throw new NotFoundException('행정부를 찾을 수 없거나 수정 권한이 없습니다.')
    return serializeBigInt(cabinet)
  }

  /**
   * 행정부 삭제 — 소속 각료·수반 재임 포함 관련 데이터 모두 삭제.
   */
  @Delete('cabinets/:cabinetId')
  async deleteCabinet(
    @Req() req: Request,
    @Param('cabinetId') cabinetId: string,
  ): Promise<void> {
    const accountId = (req as any).user?.id ?? (req as any).user?.sub
    await this.personService.deleteCabinet(cabinetId, accountId)
  }

  /**
   * 행정부 ID로 소속 각료(재임) 목록. 로그인 시 해당 계정 소유 행정부만 접근 가능.
   */
  @Get('cabinets/:cabinetId/tenures')
  async getTenuresByCabinetId(
    @Req() req: Request,
    @Param('cabinetId') cabinetId: string,
  ): Promise<any[]> {
    const accountId = (req as any).user?.id ?? (req as any).user?.sub
    const list = await this.personService.findTenuresByCabinetId(cabinetId, accountId)
    return list.map(serializeBigInt)
  }

  /**
   * 조직(만철, 관동군, 대만총독부 등) 역대 수장
   */
  @Get('organizations/:organizationId/heads')
  async getOrganizationHeads(@Param('organizationId') organizationId: string): Promise<any[]> {
    const list = await this.personService.findTenuresByOrganizationId(organizationId)
    return list.map(serializeBigInt)
  }

  /**
   * 국가원수/왕위 재임 기록 추가. 로그인 시 현재 계정 소유로 저장.
   */
  @Post('tenures')
  async addTenure(@Req() req: Request, @Body() dto: CreateGovernmentPositionTenureDto): Promise<any> {
    const accountId = (req as any).user?.id ?? (req as any).user?.sub
    const result = await this.personService.addGovernmentPositionTenure(dto, accountId)
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
   * 재임 업적 수정
   */
  @Patch('tenures/:tenureId/achievements/:achievementId')
  async updateTenureAchievement(
    @Param('tenureId') tenureId: string,
    @Param('achievementId') achievementId: string,
    @Body() dto: UpdateTenureAchievementDto,
  ): Promise<any> {
    const result = await this.personService.updateTenureAchievement(
      tenureId,
      achievementId,
      dto,
    )
    return serializeBigInt(result)
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
