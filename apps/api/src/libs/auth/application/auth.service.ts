import {
  BadRequestException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { JwtService, type JwtSignOptions } from '@nestjs/jwt'
import * as bcrypt from 'bcrypt'
import { createHash, randomUUID } from 'crypto'
import { AccountRepository } from '../domain/account.repository'
import { AppConfigService } from '../../shared/config/config.service'
import {AggregateType, EventMethod } from '@prisma/client'
import { parseDurationMs } from '../domain/duration.util'

/** 토큰 종류 — JwtStrategy는 'access'(또는 종류 없는 옛 토큰)만, refresh 엔드포인트는 'refresh'만 받는다 */
export type TokenType = 'access' | 'refresh'

/** 리프레시 토큰은 원문 대신 해시로만 저장한다 — DB가 새도 토큰으로 쓸 수 없게 */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

const DEFAULT_REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000
@Injectable()
export class AuthService {
  constructor(
    @Inject('AccountRepository') private readonly accounts: AccountRepository,
    private readonly jwt: JwtService,
    private readonly configService: AppConfigService,
  ) {}



  /**
   * 로그인 
   * @param input - 로그인 정보
   * @returns - 액세스 토큰과 리프레시 토큰
   */
  async login(input: {
    account: string
    password: string
  }): Promise<{ accessToken: string; refreshToken: string }> {
    const account = await this.accounts.findUnique({ 
      username: input.account 
    })

    if (!account) {
      throw new UnauthorizedException('Invalid credentials')
    }

    // 비밀번호 검증
    const isPasswordOk = await bcrypt.compare(input.password, account.passwordHash)
    if (!isPasswordOk) {
      throw new UnauthorizedException('Invalid credentials')
    }

    // 로그 기록
    await this.accounts.createLog({
      ownerType: AggregateType.ACCOUNT,
      recordId: account.id,
      method: EventMethod.UPDATE,
      message: `${account.username}님이 로그인하였습니다.`
    })

    const accessToken = await this.signAccessToken(account.id)
    const refreshToken = await this.issueRefreshToken(account.id)

    return { accessToken, refreshToken }
  }

  /**
   * 로그아웃 — 리프레시 토큰을 취소해 더는 액세스 토큰을 재발급받지 못하게 한다.
   * 이미 발급된 액세스 토큰은 만료(JWT_EXPIRES_IN)까지 유효하다.
   */
  async logout(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) return
    await this.accounts.revokeRefreshToken(hashToken(refreshToken))
  }

  private signAccessToken(accountId: string): Promise<string> {
    return this.jwt.signAsync({ sub: accountId, type: 'access' satisfies TokenType })
  }

  /** 리프레시 토큰 서명 + DB 기록. jti가 있어야 같은 초에 두 번 로그인해도 해시가 겹치지 않는다. */
  async issueRefreshToken(accountId: string): Promise<string> {
    const expiresIn = this.configService.jwt.refreshExpiresIn
    const ttlMs = parseDurationMs(expiresIn) ?? DEFAULT_REFRESH_TTL_MS
    const token = await this.jwt.signAsync(
      { sub: accountId, type: 'refresh' satisfies TokenType, jti: randomUUID() },
      { expiresIn: expiresIn as JwtSignOptions['expiresIn'] },
    )
    await this.accounts.deleteStaleRefreshTokens(accountId)
    await this.accounts.createRefreshToken({
      accountId,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + ttlMs),
    })
    return token
  }

  /**
   * 비밀번호 변경
   * @param userId - 계정 ID
   * @param currentPassword - 현재 비밀번호 (검증용)
   * @param newPassword - 새 비밀번호
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const account = await this.accounts.findById(userId)
    if (!account) {
      throw new UnauthorizedException('Account not found')
    }

    const isPasswordOk = await bcrypt.compare(
      currentPassword,
      account.passwordHash,
    )
    if (!isPasswordOk) {
      throw new UnauthorizedException('현재 비밀번호가 일치하지 않습니다.')
    }

    const newHash = await bcrypt.hash(newPassword, 10)
    await this.accounts.updatePassword(userId, newHash)
    // 비밀번호가 바뀌면 다른 기기의 세션도 더는 갱신되지 않게 한다
    await this.accounts.revokeAllRefreshTokens(userId)

    await this.accounts.createLog({
      ownerType: AggregateType.ACCOUNT,
      recordId: account.id,
      method: EventMethod.UPDATE,
      message: `${account.username}님이 비밀번호를 변경하였습니다.`,
    })
  }

  /**
   * 닉네임(표시명, displayName) 변경. 로그인 ID(username)는 건드리지 않는다.
   * 표시명은 고유할 필요가 없어 중복 검사 없음.
   * @param userId - 계정 ID
   * @param displayName - 새 닉네임
   * @returns - 변경된 닉네임
   */
  async changeDisplayName(userId: string, displayName: string): Promise<string> {
    const trimmed = displayName.trim()

    await this.accounts.updateDisplayName(userId, trimmed)

    await this.accounts.createLog({
      ownerType: AggregateType.ACCOUNT,
      recordId: userId,
      method: EventMethod.UPDATE,
      message: `닉네임을 '${trimmed}'(으)로 변경하였습니다.`,
    })

    return trimmed
  }

  /**
   * 대표 인물(아바타) 지정/해제. personId가 있으면 본인 소유 인물인지 검증.
   * @param userId - 계정 ID
   * @param personId - 대표 인물 ID, null/undefined면 해제
   */
  async setRepresentativePerson(
    userId: string,
    personId: string | null | undefined,
  ): Promise<void> {
    if (personId) {
      const owned = await this.accounts.isPersonOwnedBy(personId, userId)
      if (!owned) {
        throw new BadRequestException(
          '본인이 등록한 인물만 대표로 지정할 수 있습니다.',
        )
      }
    }
    await this.accounts.updateRepresentativePerson(userId, personId ?? null)
  }

  /**
   * 토큰 검증
   * @param token - 토큰
   * @returns - 토큰 페이로드
   */
  async validateToken(token: string): Promise<{ sub: string } | null> {
    try {
      const payload = await this.jwt.verifyAsync(token, {
        secret: this.configService.jwt.secret,
      })
      return payload
    } catch {
      return null
    }
  }

  /**
   * 리프레시 토큰 갱신 
   * @param refreshToken - 리프레시 토큰
   * @returns - 액세스 토큰
   */
  async refreshToken(
    refreshToken: string,
  ): Promise<{ accessToken: string } | null> {
    try {
      const payload = await this.jwt.verifyAsync<{
        sub: string
        type?: string
      }>(refreshToken, { secret: this.configService.jwt.secret })

      if (payload?.type !== 'refresh') return null

      // 서명만으로는 로그아웃·비밀번호 변경을 반영할 수 없다 — DB에 살아 있는 토큰이어야 한다
      const ownerId = await this.accounts.findActiveRefreshTokenAccountId(hashToken(refreshToken))
      if (!ownerId || ownerId !== payload.sub) return null

      const accessToken = await this.signAccessToken(payload.sub)
      return { accessToken }
    } catch {
      return null
    }
  }
}
