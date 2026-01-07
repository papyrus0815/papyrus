import { Injectable } from '@nestjs/common'
import { PrismaService } from '@prisma/prisma.service'
import { IUserRepository } from '../domain/user.repository'
import { UserEntity } from '../domain/user.entity'

/**
 * Prisma에서 반환한 데이터를 Entity로 변환하는 헬퍼 함수
 * null을 undefined로 변환
 */
function toUserEntity(data: any): UserEntity {
  return new UserEntity({
    ...data,
    bio: data.bio ?? undefined,
    profileImageUrl: data.profileImageUrl ?? undefined,
    lastLoginAt: data.lastLoginAt ?? undefined,
  })
}

@Injectable()
export class UserPrismaRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: Omit<UserEntity, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<UserEntity> {
    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        passwordHash: data.passwordHash,
        displayName: data.displayName,
        bio: data.bio,
        profileImageUrl: data.profileImageUrl,
        role: data.role,
        emailVerified: data.emailVerified,
        isActive: data.isActive,
        followerCount: data.followerCount || 0,
        followingCount: data.followingCount || 0,
        curationCount: data.curationCount || 0,
      },
    })

    return toUserEntity(user)
  }

  async findById(id: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    })

    return user ? toUserEntity(user) : null
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    })

    return user ? toUserEntity(user) : null
  }

  async findByDisplayName(displayName: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.findFirst({
      where: { displayName },
    })

    return user ? toUserEntity(user) : null
  }

  async update(id: string, data: Partial<UserEntity>): Promise<UserEntity> {
    const user = await this.prisma.user.update({
      where: { id },
      data,
    })

    return toUserEntity(user)
  }

  async delete(id: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: { isActive: false },
    })
  }

  async findMany(params: {
    skip?: number
    take?: number
    where?: {
      role?: string
      isActive?: boolean
      emailVerified?: boolean
    }
    orderBy?: {
      createdAt?: 'asc' | 'desc'
      followerCount?: 'asc' | 'desc'
    }
  }): Promise<{ users: UserEntity[]; total: number }> {
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        skip: params.skip,
        take: params.take,
        where: params.where as any,
        orderBy: params.orderBy,
      }),
      this.prisma.user.count({
        where: params.where as any,
      }),
    ])

    return {
      users: users.map((user: any) => toUserEntity(user)),
      total,
    }
  }

  async incrementFollowerCount(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { followerCount: { increment: 1 } },
    })
  }

  async decrementFollowerCount(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { followerCount: { decrement: 1 } },
    })
  }

  async incrementFollowingCount(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { followingCount: { increment: 1 } },
    })
  }

  async decrementFollowingCount(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { followingCount: { decrement: 1 } },
    })
  }

  async incrementCurationCount(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { curationCount: { increment: 1 } },
    })
  }

  async decrementCurationCount(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { curationCount: { decrement: 1 } },
    })
  }
}
