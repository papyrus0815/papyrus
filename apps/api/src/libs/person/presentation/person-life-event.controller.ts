import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
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

  /** 특정 인물의 연보 목록 (시간순) */
  @Get('by-person/:personId')
  async listByPerson(
    @Param('personId') personId: string,
  ): Promise<PersonLifeEventResponseDto[]> {
    const rows = await this.personService.findPersonLifeEventsByPersonId(personId)
    return rows.map(serializeBigInt)
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
