import {
  Controller,
  Req,
  Res,
  UseGuards,
  Post,
  Get,
  Body,
  UnauthorizedException,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { AuthService } from '../application/auth.service'
import { LoginDto } from './dto/login.dto'
import type { LoginResponseDto } from './dto/login.response'
import { AuthGuard } from '@nestjs/passport'
import { Inject } from '@nestjs/common'
import { AccountsPrismaRepository } from '../infrastructure/accounts.prisma.repository'
import type { Response } from 'express'
import { AppConfigService } from '../../shared/config'
// import { TypedBody, TypedRoute } from '@nestia/core'
import type { AccountMeResponseDto } from './dto/account-me.response'

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly configService: AppConfigService,
  ) {}

  @Post('login')
  @ApiOperation({ summary: '로그인' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponseDto> {
    const { accessToken, refreshToken } = await this.auth.login(dto)
    const cookieSettings = this.configService.security.cookieSettings
    
    // httpOnly 쿠키로 발급
    res.cookie('access_token', accessToken, {
      ...cookieSettings,
      maxAge: 1000 * 60 * 60 * 24 * 30, // 30d
    })
    res.cookie('refresh_token', refreshToken, {
      ...cookieSettings,
      maxAge: 1000 * 60 * 60 * 24 * 90, // 90d
    })

    return { accessToken, refreshToken }
  }

  @Get('session')
  @ApiOperation({ summary: '세션 디버그: 쿠키 및 토큰 상태' })
  async session(@Req() req: any): Promise<{
    hasAccessCookie: boolean
    hasRefreshCookie: boolean
    accessValid: boolean
  }> {
    const access = req.cookies?.access_token
    const refresh = req.cookies?.refresh_token
    
    const accessValid = access ? 
      Boolean(await this.auth.validateToken(access)) : 
      false

    return {
      hasAccessCookie: Boolean(access),
      hasRefreshCookie: Boolean(refresh),
      accessValid,
    }
  }

  @Post('refresh')
  @ApiOperation({ summary: '리프레시 토큰으로 액세스 토큰 재발급' })
  async refresh(
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ ok: boolean }> {
    const refreshToken = req.cookies?.refresh_token as string | undefined
    if (!refreshToken) return { ok: false }
    
    const result = await this.auth.refreshToken(refreshToken)
    if (!result) return { ok: false }
    
    const cookieSettings = this.configService.security.cookieSettings
    res.cookie('access_token', result.accessToken, {
      ...cookieSettings,
      maxAge: 1000 * 60 * 60 * 24 * 30, // 30d
    })

    return { ok: true }
  }
}

@ApiTags('account')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('account')
export class AccountController {
  constructor(
    @Inject(AccountsPrismaRepository)
    private readonly accounts: AccountsPrismaRepository,
  ) {}

  @Get('me')
  async me(@Req() req: any): Promise<AccountMeResponseDto | null> {
    const userId = req.user?.userId as string
    const account = userId ? await this.accounts.findById(userId) : null
    if (!account) return null
    return { id: account.id, account: account.username, heroId: account.heroId }
  }
}
