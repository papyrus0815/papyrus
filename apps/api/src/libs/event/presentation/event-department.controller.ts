import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'

import { EventDepartmentService } from '../application/event-department.service'
import {
  CreateEventDepartmentDto,
  type EventDepartmentDto,
  UpdateEventDepartmentDto,
} from './dto/event-department.dto'

/**
 * 사건 ↔ 국가 기관 API — "어느 기관이 이 사건을 발령·수령·주도했나".
 * 기관 쪽 목록은 GET /administration-departments/:id/events.
 */
@ApiTags('events')
@ApiBearerAuth()
@Controller('events/:eventId/departments')
@UseGuards(AuthGuard('jwt'))
export class EventDepartmentController {
  constructor(private readonly eventDepartments: EventDepartmentService) {}

  @Get()
  async list(@Param('eventId') eventId: string): Promise<EventDepartmentDto[]> {
    return this.eventDepartments.list(eventId)
  }

  @Post()
  async add(
    @Req() req: AuthedRequest,
    @Param('eventId') eventId: string,
    @Body() body: CreateEventDepartmentDto,
  ): Promise<EventDepartmentDto> {
    return this.eventDepartments.add(userIdOf(req), eventId, body)
  }

  @Patch(':relationId')
  async update(
    @Req() req: AuthedRequest,
    @Param('eventId') eventId: string,
    @Param('relationId') relationId: string,
    @Body() body: UpdateEventDepartmentDto,
  ): Promise<EventDepartmentDto> {
    return this.eventDepartments.update(userIdOf(req), eventId, relationId, body)
  }

  @Delete(':relationId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Req() req: AuthedRequest,
    @Param('eventId') eventId: string,
    @Param('relationId') relationId: string,
  ): Promise<void> {
    await this.eventDepartments.remove(userIdOf(req), eventId, relationId)
  }
}

/** passport jwt 전략이 채우는 요청 사용자 */
interface AuthedRequest {
  user?: { id?: string; sub?: string }
}

function userIdOf(req: AuthedRequest): string {
  return req.user?.id ?? req.user?.sub ?? ''
}
