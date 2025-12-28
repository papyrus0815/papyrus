import { AccountEntity } from './account.entity'

export interface AccountRepository {
  findByUsername(username: string): Promise<AccountEntity | null>
  findById(id: string): Promise<AccountEntity | null>
}
