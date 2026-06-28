import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { AuthGuard } from '@nestjs/passport'
import { AggregateType } from '@prisma/client'
import { CommentService, CommentView } from '../application/comment.service'

/** 댓글 작성 요청 */
export interface CreateCommentDto {
  /** 대상 콘텐츠 타입 (현재 'EVENT') */
  ownerType: string
  /** 대상 콘텐츠 PK */
  recordId: string
  /** 본문 (1~1000자) */
  content: string
}

@ApiTags('comments')
@Controller('comments')
@UseGuards(AuthGuard('jwt'))
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  private actorId(req: any): string {
    return req.user?.id ?? req.user?.sub
  }

  /** 대상 콘텐츠의 댓글 목록 — GET /comments?ownerType=EVENT&recordId=xxx */
  @Get()
  async list(
    @Req() req: any,
    @Query('ownerType') ownerType: string,
    @Query('recordId') recordId: string,
  ): Promise<CommentView[]> {
    if (!recordId) throw new BadRequestException('recordId가 필요합니다')
    return this.commentService.list(toOwnerType(ownerType), recordId, this.actorId(req))
  }

  /** 댓글 작성 — POST /comments */
  @Post()
  async create(@Req() req: any, @Body() body: CreateCommentDto): Promise<CommentView> {
    return this.commentService.create(
      this.actorId(req),
      toOwnerType(body.ownerType),
      body.recordId,
      body.content,
    )
  }

  /** 댓글 삭제(소프트) — DELETE /comments/:id */
  @Delete(':id')
  async remove(@Req() req: any, @Param('id') id: string): Promise<void> {
    return this.commentService.delete(id, this.actorId(req))
  }
}

/** 문자열 → AggregateType 검증 변환 */
function toOwnerType(value: string): AggregateType {
  if (!value || !(Object.values(AggregateType) as string[]).includes(value)) {
    throw new BadRequestException('유효하지 않은 ownerType입니다')
  }
  return value as AggregateType
}
