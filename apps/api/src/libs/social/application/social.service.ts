import {
  Injectable,
  Inject,
  ConflictException,
  NotFoundException,
} from '@nestjs/common'
import { PrismaService } from '@prisma/prisma.service'

@Injectable()
export class SocialService {
  constructor(private readonly prisma: PrismaService) {}

  // ==================== FOLLOW ====================
  async follow(followerId: string, followingId: string) {
    if (followerId === followingId) {
      throw new ConflictException('자기 자신을 팔로우할 수 없습니다.')
    }

    const existing = await this.prisma.follow.findFirst({
      where: { followerId, followingId },
    })

    if (existing) {
      throw new ConflictException('이미 팔로우 중입니다.')
    }

    await this.prisma.$transaction([
      this.prisma.follow.create({
        data: { followerId, followingId },
      }),
      this.prisma.user.update({
        where: { id: followingId },
        data: { followerCount: { increment: 1 } },
      }),
      this.prisma.user.update({
        where: { id: followerId },
        data: { followingCount: { increment: 1 } },
      }),
    ])

    return { message: '팔로우했습니다.' }
  }

  async unfollow(followerId: string, followingId: string) {
    const follow = await this.prisma.follow.findFirst({
      where: { followerId, followingId },
    })

    if (!follow) {
      throw new NotFoundException('팔로우 관계가 없습니다.')
    }

    await this.prisma.$transaction([
      this.prisma.follow.delete({
        where: { id: follow.id },
      }),
      this.prisma.user.update({
        where: { id: followingId },
        data: { followerCount: { decrement: 1 } },
      }),
      this.prisma.user.update({
        where: { id: followerId },
        data: { followingCount: { decrement: 1 } },
      }),
    ])

    return { message: '언팔로우했습니다.' }
  }

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const follow = await this.prisma.follow.findFirst({
      where: { followerId, followingId },
    })
    return !!follow
  }

  // ==================== LIKE ====================
  async like(userId: string, curationId: string) {
    const existing = await this.prisma.like.findFirst({
      where: { userId, curationId },
    })

    if (existing) {
      throw new ConflictException('이미 좋아요를 눌렀습니다.')
    }

    await this.prisma.$transaction([
      this.prisma.like.create({
        data: { userId, curationId },
      }),
      this.prisma.curation.update({
        where: { id: curationId },
        data: { likeCount: { increment: 1 } },
      }),
    ])

    return { message: '좋아요를 눌렀습니다.' }
  }

  async unlike(userId: string, curationId: string) {
    const like = await this.prisma.like.findFirst({
      where: { userId, curationId },
    })

    if (!like) {
      throw new NotFoundException('좋아요를 누르지 않았습니다.')
    }

    await this.prisma.$transaction([
      this.prisma.like.delete({
        where: { id: like.id },
      }),
      this.prisma.curation.update({
        where: { id: curationId },
        data: { likeCount: { decrement: 1 } },
      }),
    ])

    return { message: '좋아요를 취소했습니다.' }
  }

  async isLiked(userId: string, curationId: string): Promise<boolean> {
    const like = await this.prisma.like.findFirst({
      where: { userId, curationId },
    })
    return !!like
  }

  // ==================== COMMENT ====================
  async createComment(
    userId: string,
    curationId: string,
    content: string,
    parentId?: string,
  ) {
    const comment = await this.prisma.$transaction(async (tx: any) => {
      const comment = await tx.comment.create({
        data: {
          userId,
          curationId,
          content,
          parentId,
        },
      })

      await tx.curation.update({
        where: { id: curationId },
        data: { commentCount: { increment: 1 } },
      })

      return comment
    })

    return comment
  }

  async updateComment(commentId: string, userId: string, content: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
    })

    if (!comment) {
      throw new NotFoundException('댓글을 찾을 수 없습니다.')
    }

    if (comment.userId !== userId) {
      throw new ConflictException('수정 권한이 없습니다.')
    }

    return await this.prisma.comment.update({
      where: { id: commentId },
      data: { content },
    })
  }

  async deleteComment(commentId: string, userId: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
    })

    if (!comment) {
      throw new NotFoundException('댓글을 찾을 수 없습니다.')
    }

    if (comment.userId !== userId) {
      throw new ConflictException('삭제 권한이 없습니다.')
    }

    await this.prisma.$transaction([
      this.prisma.comment.update({
        where: { id: commentId },
        data: { isDeleted: true },
      }),
      this.prisma.curation.update({
        where: { id: comment.curationId },
        data: { commentCount: { decrement: 1 } },
      }),
    ])

    return { message: '댓글이 삭제되었습니다.' }
  }

  async getComments(curationId: string, page = 1, pageSize = 20) {
    const skip = (page - 1) * pageSize

    const [comments, total] = await Promise.all([
      this.prisma.comment.findMany({
        where: {
          curationId,
          parentId: null, // 최상위 댓글만
          isDeleted: false,
        },
        include: {
          user: {
            select: {
              id: true,
              displayName: true,
              profileImageUrl: true,
            },
          },
          replies: {
            where: { isDeleted: false },
            include: {
              user: {
                select: {
                  id: true,
                  displayName: true,
                  profileImageUrl: true,
                },
              },
            },
          },
        },
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.comment.count({
        where: {
          curationId,
          parentId: null,
          isDeleted: false,
        },
      }),
    ])

    return { comments, total }
  }
}
