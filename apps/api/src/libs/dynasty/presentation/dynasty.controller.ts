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
} from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
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

@ApiTags('dynasties')
@Controller('dynasties')
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
