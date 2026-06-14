import {
  BadRequestException,
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
  UseGuards,
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { Request } from 'express'
import { ApiTags } from '@nestjs/swagger'
import { PersonService } from '../application/person.service'
import { PrismaClient } from '@prisma/client'
import {
  CreateGovernmentPositionTenureDto,
  CreateSovereignReignDto,
  CreateGovernmentPositionDefinitionDto,
  CreateTenureAchievementDto,
  CreateRegnalEraDto,
  UpdateRegnalEraDto,
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
 * 재임·재위 날짜의 BC('-' 시작) 문자열 명시 거부.
 * 생몰일과 달리 재임 모델(GovernmentPositionTenure/SovereignReign)에는 era 컬럼이 없어 BC를 표현할 수 없고,
 * 네이티브 Date 파싱 시 음수 부호가 조용히 무시돼 AD로 둔갑 저장되므로 400으로 막는다.
 */
function assertNoBcTenureDates(dto: { startDate?: string | null; endDate?: string | null }): void {
  for (const v of [dto.startDate, dto.endDate]) {
    if (typeof v === 'string' && v.trim().startsWith('-')) {
      throw new BadRequestException('재임·재위 날짜는 기원전(BC) 날짜를 지원하지 않습니다.')
    }
  }
}

export interface CreateCabinetBody {
  headTenureId: string
  name?: string | null
}

export interface UpdateCabinetBody {
  name?: string | null
}

export interface LinkCabinetWithOtherBody {
  otherCabinetId: string
  eventId: string
}

/**
 * 정부 직위/왕위 관리 컨트롤러
 */
@ApiTags('government-positions')
@Controller('government-positions')
export class GovernmentPositionController {
  constructor(
    private readonly personService: PersonService,
    private readonly prisma: PrismaClient,
  ) {}

  /**
   * 행정부에 연결된 사건 목록 (CabinetEvent N:M)
   */
  @UseGuards(AuthGuard('jwt'))
  @Get('cabinets/:cabinetId/events')
  async getCabinetEvents(
    @Req() req: Request,
    @Param('cabinetId') cabinetId: string,
  ): Promise<any[]> {
    const accountId = (req as any).user?.id ?? (req as any).user?.sub
    const cabinet = await this.prisma.cabinet.findUnique({
      where: { id: cabinetId },
      select: { accountId: true },
    })
    if (!cabinet) throw new NotFoundException('행정부를 찾을 수 없습니다.')
    if (cabinet.accountId && accountId && cabinet.accountId !== accountId) {
      throw new BadRequestException('이 행정부에 대한 권한이 없습니다.')
    }
    const rows = await this.prisma.cabinetEvent.findMany({
      where: { cabinetId },
      include: { event: { include: { category: true } } },
      orderBy: { createdAt: 'asc' },
    })
    return rows.map(serializeBigInt)
  }

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
   * 행정부(Cabinet) 목록 — 국가/역사적 국가별(수반 재임 소속 기준).
   * 계정으로 제한하지 않음 — 같은 국가 데이터는 워크스페이스에서 공유.
   */
  @Get('cabinets')
  async getCabinets(
    @Query('countryId') countryId?: string,
    @Query('historicalCountryId') historicalCountryId?: string,
  ): Promise<any[]> {
    const list = await this.personService.findCabinets({
      countryId,
      historicalCountryId,
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
    body: CreateCabinetBody,
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
   * 다른 나라 행정부와 묶기 — 검색 (로그인·excludeCabinetId 필수)
   */
  @UseGuards(AuthGuard('jwt'))
  @Get('cabinets/search-for-linkage')
  async searchCabinetsForLinkage(
    @Req() req: Request,
    @Query('excludeCabinetId') excludeCabinetId: string,
    @Query('q') q?: string,
    @Query('limit') limitStr?: string,
    @Query('countryId') countryId?: string,
    @Query('historicalCountryId') historicalCountryId?: string,
  ): Promise<any[]> {
    const accountId = (req as any).user?.id ?? (req as any).user?.sub
    const ex = excludeCabinetId?.trim()
    if (!ex) return []
    const limit = Math.min(Math.max(parseInt(limitStr ?? '40', 10) || 40, 1), 100)
    const cid = countryId?.trim()
    const hid = historicalCountryId?.trim()
    const filter =
      cid || hid
        ? { countryId: cid || undefined, historicalCountryId: hid || undefined }
        : undefined
    const list = await this.personService.searchCabinetsForLinkage(
      accountId,
      q ?? '',
      ex,
      limit,
      filter,
    )
    return list.map(serializeBigInt)
  }

  /**
   * 사건을 축으로 묶인 행정부 목록 (다국 행정부 연결)
   */
  @Get('cabinets/by-linkage-event/:eventId')
  async getCabinetsByLinkageEventId(@Param('eventId') eventId: string): Promise<any[]> {
    const id = eventId?.trim()
    if (!id) return []
    const list = await this.personService.findCabinetsByLinkageEventId(id)
    return list.map(serializeBigInt)
  }

  /**
   * 행정부 수정 (이름 등)
   */
  @Patch('cabinets/:cabinetId')
  async updateCabinet(
    @Req() req: Request,
    @Param('cabinetId') cabinetId: string,
    @Body() body: UpdateCabinetBody,
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
   * 행정부 한눈에 보기 — 수반·각료·여당을 한 번에. (인물 상세의 "같은 행정부 동료" 표시용)
   * 비공개(계정 소유) 행정부는 소유 계정만 접근 가능 — 그 외에는 null.
   */
  @Get('cabinets/:cabinetId/overview')
  async getCabinetOverview(
    @Req() req: Request,
    @Param('cabinetId') cabinetId: string,
  ): Promise<any | null> {
    const accountId = (req as any).user?.id ?? (req as any).user?.sub
    const overview = await this.personService.findCabinetOverview(cabinetId, accountId)
    return overview ? serializeBigInt(overview) : null
  }

  /**
   * 같은 묶음에 속한 다른 행정부 목록 (행정부 단위 다국 연결)
   */
  @UseGuards(AuthGuard('jwt'))
  @Get('cabinets/:cabinetId/linked-cabinets')
  async getLinkedCabinets(
    @Req() req: Request,
    @Param('cabinetId') cabinetId: string,
  ): Promise<any[]> {
    const accountId = (req as any).user?.id ?? (req as any).user?.sub
    const list = await this.personService.findLinkedCabinets(cabinetId, accountId)
    return list.map(serializeBigInt)
  }

  /**
   * 다른 행정부와 같은 묶음으로 연결
   */
  @UseGuards(AuthGuard('jwt'))
  @Post('cabinets/:cabinetId/link-with')
  async linkCabinetWithOther(
    @Req() req: Request,
    @Param('cabinetId') cabinetId: string,
    @Body() body: LinkCabinetWithOtherBody,
  ): Promise<any> {
    const accountId = (req as any).user?.id ?? (req as any).user?.sub
    const other = body?.otherCabinetId?.trim()
    const eventId = body?.eventId?.trim()
    if (!other) throw new BadRequestException('otherCabinetId가 필요합니다.')
    if (!eventId) {
      throw new BadRequestException(
        '연결할 사건(eventId)이 필요합니다. 같은 국제 사건을 먼저 선택하세요.',
      )
    }
    const cabinet = await this.personService.linkCabinetWithOther(
      cabinetId,
      other,
      accountId,
      eventId,
    )
    return serializeBigInt(cabinet)
  }

  /**
   * 이 행정부만 묶음에서 제거
   */
  @UseGuards(AuthGuard('jwt'))
  @Delete('cabinets/:cabinetId/linkage')
  async leaveCabinetLinkage(@Req() req: Request, @Param('cabinetId') cabinetId: string): Promise<void> {
    const accountId = (req as any).user?.id ?? (req as any).user?.sub
    await this.personService.leaveCabinetLinkageGroup(cabinetId, accountId)
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
    assertNoBcTenureDates(dto)
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
    assertNoBcTenureDates(dto)
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

  /** 재임 1건 + 업적 조회 (수장 비교 등 읽기 팝오버용) */
  @Get('tenures/:id/with-achievements')
  async getTenureWithAchievements(@Param('id') id: string): Promise<any> {
    return this.personService.getTenureWithAchievements(id)
  }

  /** 군주·재위 전용 기록 추가 (SovereignReign — 행정부와 별도 테이블) */
  @Post('sovereign-reigns')
  async addSovereignReign(@Req() req: Request, @Body() dto: CreateSovereignReignDto): Promise<any> {
    assertNoBcTenureDates(dto)
    const accountId = (req as any).user?.id ?? (req as any).user?.sub
    const result = await this.personService.addSovereignReign(dto, accountId)
    return serializeBigInt(result)
  }

  @Put('sovereign-reigns/:id')
  async updateSovereignReign(
    @Param('id') id: string,
    @Body() dto: Partial<CreateSovereignReignDto>,
  ): Promise<any> {
    assertNoBcTenureDates(dto)
    const result = await this.personService.updateSovereignReign(id, dto)
    return serializeBigInt(result)
  }

  @Delete('sovereign-reigns/:id')
  async deleteSovereignReign(@Param('id') id: string): Promise<void> {
    await this.personService.deleteSovereignReign(id)
  }

  /** 재위 1건 + 업적 조회 (수장 비교 등 읽기 팝오버용) */
  @Get('sovereign-reigns/:id/with-achievements')
  async getSovereignReignWithAchievements(@Param('id') id: string): Promise<any> {
    return this.personService.getSovereignReignWithAchievements(id)
  }

  @Post('sovereign-reigns/:sovereignReignId/achievements')
  async addSovereignReignAchievement(
    @Param('sovereignReignId') sovereignReignId: string,
    @Body() dto: CreateTenureAchievementDto,
  ): Promise<any> {
    const result = await this.personService.createSovereignReignAchievement(sovereignReignId, dto)
    return serializeBigInt(result)
  }

  @Patch('sovereign-reigns/:sovereignReignId/achievements/:achievementId')
  async updateSovereignReignAchievement(
    @Param('sovereignReignId') sovereignReignId: string,
    @Param('achievementId') achievementId: string,
    @Body() dto: UpdateTenureAchievementDto,
  ): Promise<any> {
    const result = await this.personService.updateSovereignReignAchievement(
      sovereignReignId,
      achievementId,
      dto,
    )
    return serializeBigInt(result)
  }

  @Delete('sovereign-reigns/:sovereignReignId/achievements/:achievementId')
  async deleteSovereignReignAchievement(
    @Param('sovereignReignId') sovereignReignId: string,
    @Param('achievementId') achievementId: string,
  ): Promise<void> {
    await this.personService.deleteSovereignReignAchievement(sovereignReignId, achievementId)
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
   * 동일 사건(eventId)에 연결된 재임 업적 전부 — 다국 행정부에서 같은 사건을 엮었을 때 공유 목록
   */
  @Get('achievements/by-event/:eventId')
  async getTenureAchievementsByEventId(
    @Param('eventId') eventId: string,
  ): Promise<any[]> {
    const list = await this.personService.findTenureAchievementsByEventId(eventId)
    return list.map(serializeBigInt)
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

  /**
   * 수반 재임에 연호·시대명 추가 (일본 연호, 유럽식 재위 시대명 등)
   */
  @Post('tenures/:tenureId/regnal-eras')
  async addRegnalEra(
    @Param('tenureId') tenureId: string,
    @Body() dto: CreateRegnalEraDto,
  ): Promise<any> {
    const result = await this.personService.createRegnalEra(tenureId, dto)
    return serializeBigInt(result)
  }

  @Post('sovereign-reigns/:sovereignReignId/regnal-eras')
  async addSovereignReignRegnalEra(
    @Param('sovereignReignId') sovereignReignId: string,
    @Body() dto: CreateRegnalEraDto,
  ): Promise<any> {
    const result = await this.personService.createRegnalEraForSovereignReign(sovereignReignId, dto)
    return serializeBigInt(result)
  }

  @Patch('regnal-eras/:id')
  async patchRegnalEra(
    @Param('id') id: string,
    @Body() dto: UpdateRegnalEraDto,
  ): Promise<any> {
    const result = await this.personService.updateRegnalEra(id, dto)
    return serializeBigInt(result)
  }

  @Delete('regnal-eras/:id')
  async deleteRegnalEra(@Param('id') id: string): Promise<void> {
    await this.personService.deleteRegnalEra(id)
  }
}
