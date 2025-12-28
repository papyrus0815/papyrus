import { Injectable } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { AccountRepository } from '../domain/account.repository'
import { AccountEntity } from '../domain/account.entity'

@Injectable()
export class AccountsPrismaRepository implements AccountRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByUsername(username: string): Promise<AccountEntity | null> {
    const accountRecord = await this.prisma.account.findUnique({
      where: { username },
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
}
