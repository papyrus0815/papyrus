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
  /** 발급한 리프레시 토큰 기록 (원문 대신 해시만 저장) */
  createRefreshToken(data: { accountId: string; tokenHash: string; expiresAt: Date }): Promise<void>
  /** 해시로 찾은 토큰이 취소되지 않았고 만료 전이면 그 소유 계정 ID */
  findActiveRefreshTokenAccountId(tokenHash: string): Promise<string | null>
  revokeRefreshToken(tokenHash: string): Promise<void>
  /** 계정의 모든 리프레시 토큰 취소 — 비밀번호 변경 시 다른 기기 세션 종료 */
  revokeAllRefreshTokens(accountId: string): Promise<void>
  /** 만료됐거나 취소된 행 정리 */
  deleteStaleRefreshTokens(accountId: string): Promise<void>
}
