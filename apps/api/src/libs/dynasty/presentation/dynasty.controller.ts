import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { AuthGuard } from '@nestjs/passport'
import { DynastyService } from '../application/dynasty.service'
import {
  CreateDynastyDto,
  DynastyDetailResponseDto,
  DynastyResponseDto,
  UpdateDynastyDto,
} from './dto'

type DynastyRow = Awaited<ReturnType<DynastyService['findById']>>

function toResponseDto(d: DynastyRow): DynastyResponseDto {
  return {
    id: d.id,
    name: d.name,
    description: d.description,
    startDate: d.startDate ? d.startDate.toISOString() : null,
    endDate: d.endDate ? d.endDate.toISOString() : null,
    startReason: d.startReason,
    endReason: d.endReason,
    thumbnailUrl: d.thumbnailUrl,
    originPlace: d.originPlace,
    founderId: d.founderId,
    founder: d.founder
      ? {
          id: d.founder.id,
          name: d.founder.name,
          surname: d.founder.surname,
          birthDate: d.founder.birthDate
            ? d.founder.birthDate.toISOString()
            : null,
          deathDate: d.founder.deathDate
            ? d.founder.deathDate.toISOString()
            : null,
        }
      : null,
    founderText: d.founderText,
    crestImageUrl: d.crestImageUrl,
    motto: d.motto,
    memberCount: d.memberCount,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  }
}

/**
 * 가문(왕조) API — 로그인 필수.
 *
 * Dynasty도 `accountId`가 없는 공유 카탈로그라 소유자 게이트는 불가(마이그레이션 선행).
 * 읽기 포함 클래스 레벨 가드가 안전함을 확인: 가문 조회는 로그인 화면(가문 페이지·
 * 인물 등록 모달·리치텍스트 멘션) 안에서만 쓰이고, 비로그인 라우트인 /genealogy는
 * 가문명을 인물 응답에 실려 오는 값으로 표시할 뿐 이 API를 호출하지 않는다.
 */
@ApiTags('dynasties')
@Controller('dynasties')
@UseGuards(AuthGuard('jwt'))
export class DynastyController {
  constructor(private readonly dynastyService: DynastyService) {}

  @Get()
  async getAll(): Promise<DynastyResponseDto[]> {
    const dynasties = await this.dynastyService.findAll()
    return dynasties.map(toResponseDto)
  }

  @Get(':id')
  async getById(@Param('id') id: string): Promise<DynastyResponseDto> {
    const d = await this.dynastyService.findById(id)
    return toResponseDto(d)
  }

  /** 가문 상세: 기본 + 통치 국가 + 구성원 미리보기 */
  @Get(':id/detail')
  async getDetail(@Param('id') id: string): Promise<DynastyDetailResponseDto> {
    const d = await this.dynastyService.findDetail(id)
    return {
      ...toResponseDto(d),
      historicalRules: d.historicalRules,
      modernRules: d.modernRules,
      memberCount: d.memberCount,
      members: d.members,
    }
  }

  @Post()
  async create(@Body() dto: CreateDynastyDto): Promise<DynastyResponseDto> {
    const d = await this.dynastyService.create({
      name: dto.name,
      description: dto.description,
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      startReason: dto.startReason,
      endReason: dto.endReason,
      thumbnailUrl: dto.thumbnailUrl,
      originPlace: dto.originPlace,
      founderId: dto.founderId,
      founderText: dto.founderText,
      crestImageUrl: dto.crestImageUrl,
      motto: dto.motto,
    })
    return toResponseDto(d)
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateDynastyDto,
  ): Promise<DynastyResponseDto> {
    const d = await this.dynastyService.update(id, {
      name: dto.name,
      description: dto.description,
      // null → 클리어, 문자열 → 새 값, undefined → 변경 없음
      startDate:
        dto.startDate === null
          ? null
          : dto.startDate
            ? new Date(dto.startDate)
            : undefined,
      endDate:
        dto.endDate === null
          ? null
          : dto.endDate
            ? new Date(dto.endDate)
            : undefined,
      // 문자열 사유는 Date 변환 불필요 — undefined=유지/null=클리어/string=값 그대로 전달
      startReason: dto.startReason,
      endReason: dto.endReason,
      thumbnailUrl: dto.thumbnailUrl,
      originPlace: dto.originPlace,
      founderId: dto.founderId,
      founderText: dto.founderText,
      crestImageUrl: dto.crestImageUrl,
      motto: dto.motto,
    })
    return toResponseDto(d)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string): Promise<void> {
    await this.dynastyService.delete(id)
  }
}
