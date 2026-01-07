import { AccountEntity } from './account.entity'
import { Account, ActionLog, Prisma } from '@prisma/client/client'
export interface AccountRepository {
  findUnique(where: Prisma.AccountWhereUniqueInput): Promise<Account | null>
  findById(id: string): Promise<AccountEntity | null>
  createLog(data: Prisma.ActionLogCreateInput): Promise<ActionLog | null>
}
