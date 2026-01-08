import { Inject, Injectable, UnauthorizedException } from '@nestjs/common'
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
