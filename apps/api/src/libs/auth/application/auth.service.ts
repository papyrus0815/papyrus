import { Inject, Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcrypt'
import { AccountRepository } from '../domain/account.repository'
import { AppConfigService } from '../../shared/config'

@Injectable()
export class AuthService {
  constructor(
    @Inject('AccountRepository') private readonly accounts: AccountRepository,
    private readonly jwt: JwtService,
    private readonly configService: AppConfigService,
  ) {}

  async login(input: {
    account: string
    password: string
  }): Promise<{ accessToken: string; refreshToken: string }> {
    const account = await this.accounts.findByUsername(input.account)
    if (!account) throw new UnauthorizedException('Invalid credentials')

    const ok = await bcrypt.compare(input.password, account.passwordHash)
    if (!ok) throw new UnauthorizedException('Invalid credentials')

    const accessToken = await this.jwt.signAsync({ sub: account.id })
    const refreshToken = await this.jwt.signAsync(
      { sub: account.id, type: 'refresh' },
      { expiresIn: this.configService.jwt.refreshExpiresIn },
    )

    return { accessToken, refreshToken }
  }

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
