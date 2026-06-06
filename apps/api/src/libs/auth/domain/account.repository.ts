import { Account, ActionLog, Prisma } from '@prisma/client'

import { AccountEntity } from './account.entity'

export interface AccountRepository {
  findUnique(where: Prisma.AccountWhereUniqueInput): Promise<Account | null>
  findById(id: string): Promise<AccountEntity | null>
  updatePassword(id: string, passwordHash: string): Promise<void>
  updateDisplayName(id: string, displayName: string): Promise<void>
  updateRepresentativePerson(id: string, personId: string | null): Promise<void>
  isPersonOwnedBy(personId: string, accountId: string): Promise<boolean>
  createLog(data: Prisma.ActionLogCreateInput): Promise<ActionLog | null>
}
