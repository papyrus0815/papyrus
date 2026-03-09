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
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import {
  CurationService,
  CreateCurationDto,
  UpdateCurationDto,
} from '../application/curation.service'
import { UserService } from '../../../libs/user/application/user.service'

// Request 타입 정의
export interface AuthenticatedRequest {
  user?: {
    id: string
    [key: string]: unknown
  }
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

@Controller('posts')
@UseGuards(AuthGuard('jwt'))
export class CurationController {
  constructor(
    private readonly curationService: CurationService,
    private readonly userService: UserService,
  ) {}

  /** 관리자용: 전체 글 목록 (페이지네이션, 상태 필터) */
  @Get()
  async findMany(
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '20',
    @Query('status') status?: string,
    @Query('orderBy') orderBy: 'createdAt' | 'publishedAt' | 'viewCount' | 'likeCount' = 'publishedAt',
    @Query('order') order: 'asc' | 'desc' = 'desc',
  ): Promise<PaginatedCurationResponse> {
    const result = await this.curationService.findMany({
      page: parseInt(page, 10),
      pageSize: parseInt(pageSize, 10),
      status: status as any,
      orderBy,
      order,
    })
    return { curations: result.curations, total: result.total }
  }

  @Post()
  async create(
    @Request() req: AuthenticatedRequest,
    @Body() dto: CreateCurationDto,
  ): Promise<CurationResponse> {
    const accountId = req.user?.id
    if (!accountId) {
      throw new UnauthorizedException('로그인이 필요합니다.')
    }
    const user = await this.userService.getOrCreateUserForAccount(accountId)
    return await this.curationService.create(user.id, dto)
  }

  @Get(':id')
  async findById(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<CurationResponse> {
    const viewerId = req.user?.id
    return await this.curationService.findById(id, viewerId)
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
    const accountId = req.user?.id
    if (!accountId) throw new UnauthorizedException('로그인이 필요합니다.')
    const user = await this.userService.getOrCreateUserForAccount(accountId)
    return await this.curationService.update(id, user.id, dto)
  }

  @Post(':id/publish')
  async publish(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<CurationResponse> {
    const accountId = req.user?.id
    if (!accountId) throw new UnauthorizedException('로그인이 필요합니다.')
    const user = await this.userService.getOrCreateUserForAccount(accountId)
    return await this.curationService.publish(id, user.id)
  }

  @Delete(':id')
  async delete(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<MessageResponse> {
    const accountId = req.user?.id
    if (!accountId) throw new UnauthorizedException('로그인이 필요합니다.')
    const user = await this.userService.getOrCreateUserForAccount(accountId)
    await this.curationService.delete(id, user.id)
    return { message: '글이 삭제되었습니다.' }
  }
}
