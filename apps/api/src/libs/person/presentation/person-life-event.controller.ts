import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { ApiTags } from '@nestjs/swagger'
import { Request } from 'express'
import { PersonService } from '../application/person.service'
import {
  CreatePersonLifeEventDto,
  PersonLifeEventResponseDto,
  UpdatePersonLifeEventDto,
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
 * 인물 연보(PersonLifeEvent) 컨트롤러
 * - 자유 서술형 시간축 기록 (재위·행정부 재임·Event 외)
 */
@ApiTags('person-life-events')
@Controller('person-life-events')
export class PersonLifeEventController {
  constructor(private readonly personService: PersonService) {}

  /**
   * 특정 인물의 연보 목록 (시간순).
   * - `limit`: 선택. 반환 개수 상한(기본 미제한, 상한 200). 인물당 연보가 매우 많을 때 페이로드 보호.
   */
  @Get('by-person/:personId')
  async listByPerson(
    @Param('personId') personId: string,
    @Query('limit') limit?: string,
  ): Promise<PersonLifeEventResponseDto[]> {
    const rows = await this.personService.findPersonLifeEventsByPersonId(personId)
    const parsed = limit ? Number.parseInt(limit, 10) : NaN
    const capped = Number.isFinite(parsed) && parsed > 0
      ? Math.min(parsed, 200)
      : null
    const sliced = capped != null ? rows.slice(0, capped) : rows
    return sliced.map(serializeBigInt)
  }

  /** 연보 기록 생성 */
  @UseGuards(AuthGuard('jwt'))
  @Post()
  async create(
    @Req() req: Request,
    @Body() dto: CreatePersonLifeEventDto,
  ): Promise<PersonLifeEventResponseDto> {
    const accountId = (req as any).user?.id ?? (req as any).user?.sub
    const row = await this.personService.addPersonLifeEvent(dto, accountId)
    return serializeBigInt(row)
  }

  /** 연보 기록 수정 */
  @UseGuards(AuthGuard('jwt'))
  @Put(':id')
  async update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdatePersonLifeEventDto,
  ): Promise<PersonLifeEventResponseDto> {
    const accountId = (req as any).user?.id ?? (req as any).user?.sub
    const row = await this.personService.updatePersonLifeEvent(id, dto, accountId)
    return serializeBigInt(row)
  }

  /** 연보 기록 삭제 */
  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  async remove(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<{ success: true }> {
    const accountId = (req as any).user?.id ?? (req as any).user?.sub
    await this.personService.deletePersonLifeEvent(id, accountId)
    return { success: true }
  }
}
