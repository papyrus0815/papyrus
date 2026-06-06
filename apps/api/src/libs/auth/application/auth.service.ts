import {
  BadRequestException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcrypt'
import { AccountRepository } from '../domain/account.repository'
import { AppConfigService } from '../../shared/config/config.service'
import {AggregateType, EventMethod } from '@prisma/client'
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

    // 액세스 토큰 생성
    const accessToken = await this.jwt.signAsync({ sub: account.id })
    const refreshToken = await this.jwt.signAsync(
      { sub: account.id, type: 'refresh' },
      { expiresIn: this.configService.jwt.refreshExpiresIn as any},
    )

    return { accessToken, refreshToken }
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

      const accessToken = await this.jwt.signAsync({ sub: payload.sub })
      return { accessToken }
    } catch {
      return null
    }
  }
}
