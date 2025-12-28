import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Request,
} from '@nestjs/common'
import {
  CurationService,
  CreateCurationDto,
  UpdateCurationDto,
} from '../application/curation.service'
import { AggregateType } from '@prisma/client'

// Request 타입 정의
export interface AuthenticatedRequest {
  user?: {
    id: string
    [key: string]: unknown
  }
}

export interface ReportCurationDto {
  reason: string
}

export interface MessageResponse {
  message: string
}

// Curation 응답 타입 (서비스의 실제 반환 타입을 허용)
// TODO: CurationEntity의 정확한 타입을 정의하여 any 제거
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type CurationResponse = any

export interface PaginatedCurationResponse {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  curations: any[]
  total: number
}

@Controller('curations')
export class CurationController {
  constructor(private readonly curationService: CurationService) {}

  @Post()
  async create(
    @Request() req: AuthenticatedRequest,
    @Body() dto: CreateCurationDto,
  ): Promise<CurationResponse> {
    const userId = req.user?.id || 'temp_user_id'
    return await this.curationService.create(userId, dto)
  }

  @Get(':id')
  async findById(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<CurationResponse> {
    const viewerId = req.user?.id
    return await this.curationService.findById(id, viewerId)
  }

  @Get('item/:itemType/:itemId')
  async getItemFeed(
    @Param('itemType') itemType: AggregateType,
    @Param('itemId') itemId: string,
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '20',
  ): Promise<PaginatedCurationResponse> {
    return await this.curationService.getItemFeed(
      itemType,
      itemId,
      parseInt(page),
      parseInt(pageSize),
    )
  }

  @Get('user/:userId')
  async getUserCurations(
    @Param('userId') userId: string,
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '20',
  ): Promise<PaginatedCurationResponse> {
    return await this.curationService.getUserCurations(
      userId,
      parseInt(page),
      parseInt(pageSize),
    )
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
    @Body() dto: UpdateCurationDto,
  ): Promise<CurationResponse> {
    const userId = req.user?.id || 'temp_user_id'
    return await this.curationService.update(id, userId, dto)
  }

  @Post(':id/publish')
  async publish(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<CurationResponse> {
    const userId = req.user?.id || 'temp_user_id'
    return await this.curationService.publish(id, userId)
  }

  @Delete(':id')
  async delete(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<MessageResponse> {
    const userId = req.user?.id || 'temp_user_id'
    await this.curationService.delete(id, userId)
    return { message: '큐레이션이 삭제되었습니다.' }
  }

  @Post(':id/verify')
  async verify(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<CurationResponse> {
    const curatorId = req.user?.id || 'temp_user_id'
    return await this.curationService.verify(id, curatorId)
  }

  @Post(':id/report')
  async report(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
    @Body() dto: ReportCurationDto,
  ): Promise<MessageResponse> {
    const userId = req.user?.id || 'temp_user_id'
    await this.curationService.report(id, userId, dto.reason)
    return { message: '신고가 접수되었습니다.' }
  }
}
