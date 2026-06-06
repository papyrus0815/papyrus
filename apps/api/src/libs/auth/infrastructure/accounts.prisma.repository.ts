import { Injectable } from '@nestjs/common'
import { PrismaService } from '@prisma/prisma.service'
import { AccountRepository } from '../domain/account.repository'
import { AccountEntity } from '../domain/account.entity'
import { Account, ActionLog, Prisma } from '@prisma/client'
@Injectable()
export class AccountsPrismaRepository implements AccountRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 계정 조회
   * @param where - 계정 조회 조건
   * @returns - 계정 엔티티 
   */
  async findUnique(where: Prisma.AccountWhereUniqueInput): Promise<Account | null> {
    return this.prisma.account.findUnique({ where });
  }

  /**
   * 계정 조회  
   * @param id - 계정 ID
   * @returns - 계정 엔티티
   */
  async findById(id: string): Promise<AccountEntity | null> {
    const accountRecord = await this.prisma.account.findUnique({
      where: { id },
    })
    return accountRecord
      ? new AccountEntity(
          accountRecord.id,
          accountRecord.username,
          accountRecord.passwordHash,
          accountRecord.heroId ?? null,
          accountRecord.createdAt,
          accountRecord.totalPoints,
          accountRecord.gradeCode,
        )
      : null
  }

  /**
   * 내 정보(프로필) 조회 — 히어로 정보를 조인해 한 번에 가져온다.
   * @param id - 계정 ID
   */
  async findMeView(id: string) {
    return this.prisma.account.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        displayName: true,
        heroId: true,
        representativePersonId: true,
        createdAt: true,
        totalPoints: true,
        gradeCode: true,
        representativePerson: {
          select: { id: true, name: true, profileImageUrl: true },
        },
      },
    })
  }

  /**
   * 대표 인물(아바타) 지정/해제. personId가 null이면 해제.
   * @param id - 계정 ID
   * @param personId - 대표 인물 ID 또는 null
   */
  async updateRepresentativePerson(
    id: string,
    personId: string | null,
  ): Promise<void> {
    await this.prisma.account.update({
      where: { id },
      data: { representativePersonId: personId },
    })
  }

  /**
   * 특정 인물이 해당 계정 소유인지 확인 (대표 인물 지정 시 검증용)
   * @param personId - 인물 ID
   * @param accountId - 계정 ID
   */
  async isPersonOwnedBy(personId: string, accountId: string): Promise<boolean> {
    const found = await this.prisma.person.findFirst({
      where: { id: personId, accountId },
      select: { id: true },
    })
    return !!found
  }

  /**
   * 비밀번호 해시 갱신
   * @param id - 계정 ID
   * @param passwordHash - 새 비밀번호 해시
   */
  async updatePassword(id: string, passwordHash: string): Promise<void> {
    await this.prisma.account.update({
      where: { id },
      data: { passwordHash },
    })
  }

  /**
   * 표시용 닉네임(displayName) 갱신
   * @param id - 계정 ID
   * @param displayName - 새 닉네임
   */
  async updateDisplayName(id: string, displayName: string): Promise<void> {
    await this.prisma.account.update({
      where: { id },
      data: { displayName },
    })
  }

  /**
   * 액션 로그 생성
   * @param data - 액션 로그 생성 데이터
   * @returns - 액션 로그 엔티티
   */
  async createLog(data: Prisma.ActionLogCreateInput): Promise<ActionLog | null> {
    return this.prisma.actionLog.create({ data });
  }
}
