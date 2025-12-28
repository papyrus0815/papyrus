import {
  Controller,
  Post,
  Delete,
  Get,
  Body,
  Param,
  Query,
  Request,
} from '@nestjs/common'
import { SocialService } from '../application/social.service'

export interface CreateCommentDto {
  content: string
  parentId?: string
}

export interface UpdateCommentDto {
  content: string
}

export interface BooleanResponse {
  isFollowing?: boolean
  isLiked?: boolean
}

@Controller('social')
export class SocialController {
  constructor(private readonly socialService: SocialService) {}

  // Follow
  @Post('follow/:userId')
  async follow(
    @Request() req: any,
    @Param('userId') userId: string,
  ): Promise<any> {
    const followerId = req.user?.id || 'temp_user_id'
    return await this.socialService.follow(followerId, userId)
  }

  @Delete('follow/:userId')
  async unfollow(
    @Request() req: any,
    @Param('userId') userId: string,
  ): Promise<any> {
    const followerId = req.user?.id || 'temp_user_id'
    return await this.socialService.unfollow(followerId, userId)
  }

  @Get('following/:userId')
  async isFollowing(
    @Request() req: any,
    @Param('userId') userId: string,
  ): Promise<BooleanResponse> {
    const followerId = req.user?.id || 'temp_user_id'
    const isFollowing = await this.socialService.isFollowing(followerId, userId)
    return { isFollowing }
  }

  // Like
  @Post('like/:curationId')
  async like(
    @Request() req: any,
    @Param('curationId') curationId: string,
  ): Promise<any> {
    const userId = req.user?.id || 'temp_user_id'
    return await this.socialService.like(userId, curationId)
  }

  @Delete('like/:curationId')
  async unlike(
    @Request() req: any,
    @Param('curationId') curationId: string,
  ): Promise<any> {
    const userId = req.user?.id || 'temp_user_id'
    return await this.socialService.unlike(userId, curationId)
  }

  @Get('liked/:curationId')
  async isLiked(
    @Request() req: any,
    @Param('curationId') curationId: string,
  ): Promise<BooleanResponse> {
    const userId = req.user?.id || 'temp_user_id'
    const isLiked = await this.socialService.isLiked(userId, curationId)
    return { isLiked }
  }

  // Comment
  @Post('comment/:curationId')
  async createComment(
    @Request() req: any,
    @Param('curationId') curationId: string,
    @Body() dto: CreateCommentDto,
  ): Promise<any> {
    const userId = req.user?.id || 'temp_user_id'
    return await this.socialService.createComment(
      userId,
      curationId,
      dto.content,
      dto.parentId,
    )
  }

  @Post('comment/:commentId/update')
  async updateComment(
    @Request() req: any,
    @Param('commentId') commentId: string,
    @Body() dto: UpdateCommentDto,
  ): Promise<any> {
    const userId = req.user?.id || 'temp_user_id'
    return await this.socialService.updateComment(
      commentId,
      userId,
      dto.content,
    )
  }

  @Delete('comment/:commentId')
  async deleteComment(
    @Request() req: any,
    @Param('commentId') commentId: string,
  ): Promise<any> {
    const userId = req.user?.id || 'temp_user_id'
    return await this.socialService.deleteComment(commentId, userId)
  }

  @Get('comments/:curationId')
  async getComments(
    @Param('curationId') curationId: string,
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '20',
  ): Promise<any> {
    return await this.socialService.getComments(
      curationId,
      parseInt(page),
      parseInt(pageSize),
    )
  }
}
