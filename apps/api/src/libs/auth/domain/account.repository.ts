import { Account, ActionLog, Prisma } from '@prisma/client'

import { AccountEntity } from './account.entity'

export interface AccountRepository {
  findUnique(where: Prisma.AccountWhereUniqueInput): Promise<Account | null>
  findById(id: string): Promise<AccountEntity | null>
  createLog(data: Prisma.ActionLogCreateInput): Promise<ActionLog | null>
}
