import { Injectable } from '@nestjs/common'
import { PrismaService } from '@prisma/prisma.service'
import { AccountRepository } from '../domain/account.repository'
import { AccountEntity } from '../domain/account.entity'
import { Account, ActionLog, Prisma } from '@prisma/client/client'
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
        )
      : null
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
